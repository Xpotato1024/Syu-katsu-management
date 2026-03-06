package company

import (
	"testing"
	"time"
)

func TestParseScheduledAt_UsesLocalLocationForTimezoneLessInput(t *testing.T) {
	jst := time.FixedZone("JST", 9*60*60)
	originalLocal := time.Local
	time.Local = jst
	t.Cleanup(func() {
		time.Local = originalLocal
	})

	tests := []struct {
		name     string
		raw      string
		expected string
	}{
		{
			name:     "datetime-local",
			raw:      "2026-03-06T10:03",
			expected: "2026-03-06T01:03:00Z",
		},
		{
			name:     "date-only",
			raw:      "2026-03-06",
			expected: "2026-03-05T15:00:00Z",
		},
		{
			name:     "rfc3339-with-offset",
			raw:      "2026-03-06T10:03:00+09:00",
			expected: "2026-03-06T01:03:00Z",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			parsed, err := parseScheduledAt(tc.raw)
			if err != nil {
				t.Fatalf("parseScheduledAt returned error: %v", err)
			}
			if parsed == nil {
				t.Fatal("parseScheduledAt returned nil")
			}
			if got := parsed.UTC().Format(time.RFC3339); got != tc.expected {
				t.Fatalf("unexpected parsed time: got=%s expected=%s", got, tc.expected)
			}
		})
	}
}

func TestParseScheduledAt_EmptyValueReturnsNil(t *testing.T) {
	parsed, err := parseScheduledAt("  ")
	if err != nil {
		t.Fatalf("parseScheduledAt returned error: %v", err)
	}
	if parsed != nil {
		t.Fatalf("expected nil for empty value, got=%v", parsed)
	}
}
