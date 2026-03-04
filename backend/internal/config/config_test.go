package config

import "testing"

func TestDBConnString(t *testing.T) {
	cfg := Config{
		DBHost:     "localhost",
		DBPort:     "5432",
		DBName:     "syukatsu",
		DBUser:     "user",
		DBPassword: "pass",
		DBSSLMode:  "disable",
	}

	got := cfg.DBConnString()
	want := "host=localhost port=5432 dbname=syukatsu user=user password=pass sslmode=disable"
	if got != want {
		t.Fatalf("unexpected conn string: got %q want %q", got, want)
	}
}
