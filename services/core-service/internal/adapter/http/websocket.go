package http

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for local testing
	},
}

type Client struct {
	UserID uuid.UUID
	Conn   *websocket.Conn
	Send   chan []byte
}

type WsHub struct {
	clients    map[uuid.UUID]map[*Client]bool
	broadcast  chan BroadcastMessage
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

type BroadcastMessage struct {
	UserID  uuid.UUID `json:"user_id"`
	Payload []byte    `json:"payload"`
}

func NewWsHub() *WsHub {
	return &WsHub{
		clients:    make(map[uuid.UUID]map[*Client]bool),
		broadcast:  make(chan BroadcastMessage),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *WsHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.UserID] == nil {
				h.clients[client.UserID] = make(map[*Client]bool)
			}
			h.clients[client.UserID][client] = true
			h.mu.Unlock()
			log.Printf("WebSocket client registered for User: %s", client.UserID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID][client]; ok {
				delete(h.clients[client.UserID], client)
				close(client.Send)
				if len(h.clients[client.UserID]) == 0 {
					delete(h.clients, client.UserID)
				}
				log.Printf("WebSocket client unregistered for User: %s", client.UserID)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			userConnections := h.clients[message.UserID]
			h.mu.RUnlock()

			for client := range userConnections {
				select {
				case client.Send <- message.Payload:
				default:
					close(client.Send)
					h.mu.Lock()
					delete(h.clients[client.UserID], client)
					h.mu.Unlock()
				}
			}
		}
	}
}

func (h *WsHub) BroadcastToUser(userID uuid.UUID, message []byte) {
	h.broadcast <- BroadcastMessage{
		UserID:  userID,
		Payload: message,
	}
}

func (h *WsHub) ServeWs(c *gin.Context, userID uuid.UUID) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket Upgrade Error: %v", err)
		return
	}

	client := &Client{
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}
	h.register <- client

	// Start reading and writing loops
	go client.writePump()
	go client.readPump(h)
}

func (c *Client) readPump(h *WsHub) {
	defer func() {
		h.unregister <- c
		c.Conn.Close()
	}()

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}
	}
}

func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()

	for {
		message, ok := <-c.Send
		if !ok {
			c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		err := c.Conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			log.Printf("WebSocket write error: %v", err)
			return
		}
	}
}
