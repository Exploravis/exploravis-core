package batch

import (
	"log"
	"sync"
	"time"
)

type Batch[T any] struct {
	items     []T
	maxSize   int
	lastFlush time.Time
	flushFn   func([]T)

	mu sync.Mutex
}

func NewBatch[T any](maxSize int, flushFn func([]T)) *Batch[T] {
	return &Batch[T]{
		items:     make([]T, 0, maxSize),
		maxSize:   maxSize,
		lastFlush: time.Now(),
		flushFn:   flushFn,
	}
}

func (b *Batch[T]) Add(item T) {

	var flushItems []T

	b.mu.Lock()
	b.items = append(b.items, item)

	if len(b.items) >= b.maxSize {
		flushItems = b.swapLocked()
	}
	b.mu.Unlock()

	if flushItems != nil {
		b.flushFn(flushItems)
	}
}

// everytime this is invoked check time and batched items and flush
// if possible if not hold
func (b *Batch[T]) FlushIfStale(maxAge time.Duration) {
	var flushItems []T

	b.mu.Lock()
	if len(b.items) > 0 && time.Since(b.lastFlush) >= maxAge {
		flushItems = b.swapLocked()
	}
	b.mu.Unlock()

	if flushItems != nil {
		b.flushFn(flushItems)

		log.Printf("Batch flushing ended")
	}
}

// flush using flushFn if possible
func (b *Batch[T]) Flush() {

	log.Printf("Flushing batch...")
	var flushItems []T

	b.mu.Lock()
	if len(b.items) > 0 {
		flushItems = b.swapLocked()
	}
	b.mu.Unlock()

	if flushItems != nil {
		b.flushFn(flushItems)
	}
}

func (b *Batch[T]) swapLocked() []T {
	out := b.items
	b.items = make([]T, 0, b.maxSize)
	b.lastFlush = time.Now()
	return out
}
