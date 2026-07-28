package messaging

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/google/uuid"
)

const diagnosisJobsQueue = "diagnosis_jobs"

// JobPublisher is the interface the usecase depends on.
type JobPublisher interface {
	PublishDiagnosisJob(diagnosisID string, userID uint, imageURL string) error
	Close()
}

// ─── AMQP Implementation ──────────────────────────────────────────────────────

type amqpPublisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

// NewAmqpPublisher connects to RabbitMQ and declares the diagnosis queue.
// Returns a NoOpPublisher if connection fails (allows local dev without RabbitMQ).
func NewAmqpPublisher(url string) JobPublisher {
	var conn *amqp.Connection
	var err error

	// Retry connection for up to 5 times (handles docker-compose startup ordering)
	for i := 1; i <= 5; i++ {
		conn, err = amqp.Dial(url)
		if err == nil {
			break
		}
		log.Printf("AMQP: failed to connect to RabbitMQ (attempt %d/5): %v. Retrying in 3s...", i, err)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Printf("AMQP: could not connect to RabbitMQ after 5 attempts. Falling back to NoOpPublisher: %v", err)
		return &noOpPublisher{}
	}

	ch, err := conn.Channel()
	if err != nil {
		log.Printf("AMQP: failed to open channel: %v. Falling back to NoOpPublisher.", err)
		conn.Close()
		return &noOpPublisher{}
	}

	// Declare a durable queue so messages survive RabbitMQ restarts
	_, err = ch.QueueDeclare(
		diagnosisJobsQueue,
		true,  // durable
		false, // auto-delete
		false, // exclusive
		false, // no-wait
		nil,
	)
	if err != nil {
		log.Printf("AMQP: failed to declare queue: %v. Falling back to NoOpPublisher.", err)
		ch.Close()
		conn.Close()
		return &noOpPublisher{}
	}

	log.Printf("AMQP: successfully connected to RabbitMQ. Queue '%s' is ready.", diagnosisJobsQueue)
	return &amqpPublisher{conn: conn, channel: ch}
}

// celeryMessage is the envelope Celery expects for AMQP-native tasks.
// See: https://docs.celeryq.dev/en/stable/internals/protocol.html
type celeryMessage struct {
	ID      string        `json:"id"`
	Task    string        `json:"task"`
	Args    []interface{} `json:"args"`
	Kwargs  interface{}   `json:"kwargs"`
	Retries int           `json:"retries"`
	Eta     interface{}   `json:"eta"`
	Expires interface{}   `json:"expires"`
}

func (p *amqpPublisher) PublishDiagnosisJob(diagnosisID string, userID uint, imageURL string) error {
	taskID := uuid.New().String()
	msg := celeryMessage{
		ID:      taskID,
		Task:    "tasks.process_diagnosis",
		Args:    []interface{}{diagnosisID, userID, imageURL},
		Kwargs:  map[string]interface{}{},
		Retries: 0,
		Eta:     nil,
		Expires: nil,
	}

	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal celery message: %w", err)
	}

	headers := amqp.Table{
		"id":          taskID,
		"task":        "tasks.process_diagnosis",
		"lang":        "py",
		"retries":     int32(0),
		"root_id":     taskID,
		"parent_id":   nil,
		"group":       nil,
		"meth":        "",
		"shadow":      nil,
		"eta":         nil,
		"expires":     nil,
		"timelimit":   []interface{}{nil, nil},
		"argsrepr":    fmt.Sprintf("(%q, %d, %q)", diagnosisID, userID, imageURL),
		"kwargsrepr":  "{}",
		"origin":      "go-core-service",
	}

	err = p.channel.Publish(
		"",                 // default exchange
		diagnosisJobsQueue, // routing key = queue name
		false,              // mandatory
		false,              // immediate
		amqp.Publishing{
			ContentType:     "application/json",
			ContentEncoding: "utf-8",
			DeliveryMode:    amqp.Persistent,
			Headers:         headers,
			Body:            body,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to publish celery task to queue: %w", err)
	}

	log.Printf("AMQP: dispatched Celery task %s (diagnosis=%s, user=%d)", taskID, diagnosisID, userID)
	return nil
}

func (p *amqpPublisher) Close() {
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		p.conn.Close()
	}
}

// ─── NoOp Fallback ────────────────────────────────────────────────────────────

type noOpPublisher struct{}

func (n *noOpPublisher) PublishDiagnosisJob(diagnosisID string, userID uint, imageURL string) error {
	log.Printf("NoOpPublisher: diagnosis job %s NOT published (RabbitMQ unavailable). Running in sync-only mode.", diagnosisID)
	return nil
}

func (n *noOpPublisher) Close() {}
