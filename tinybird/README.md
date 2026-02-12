# Tinybird Analytics

This directory contains Tinybird data sources and pipes for Cossistant analytics.

## Structure

- `datasources/` - Event schemas with TTL policies
- `endpoints/` - API endpoints (pipes) for querying analytics data

## Local Development

Tinybird Local runs automatically when you start the dev environment:

```bash
bun dev  # Starts Docker services + Tinybird Local
```

Tinybird Local runs on `http://localhost:7181` and is managed by the Tinybird CLI.

### First-Time Setup

Install the Tinybird CLI if not already installed:

```bash
pip install tinybird-cli
# or
brew install tinybird-cli
```

The `bun dev` command automatically:
1. Starts Tinybird Local (`tb local start`)
2. Makes your datasources and pipes available locally

### Manual Control

```bash
cd tinybird

# Start Tinybird Local manually
tb local start

# Check status
tb local status

# Stop Tinybird Local
tb local stop

# Development mode (auto-reload on file changes)
tb dev
```

## Datasources

### `visitor_events`
High-volume operational events (seen, page views) with 30-day TTL.

### `conversation_metrics`
Low-volume business KPIs (conversation lifecycle) with no TTL (kept indefinitely for paid customers).

## Endpoints

- `inbox_analytics` - Dashboard metrics (response time, resolution time, AI rate)
- `unique_visitors` - Unique visitor counts by date range
- `active_visitors` - Real-time active visitors with geo data
- `visitor_locations` - Geo aggregation for globe visualization

## Deployment

```bash
# Deploy to cloud (production)
tb --cloud deploy

# Or push specific resources
tb --cloud push datasources/*.datasource
tb --cloud push endpoints/*.pipe
```
