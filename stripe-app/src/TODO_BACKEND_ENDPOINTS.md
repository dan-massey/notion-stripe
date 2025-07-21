# Backend Endpoints to Implement

## Required for Notion Database Configuration

### 1. GET /notion/pages
- **Purpose**: Get list of user's Notion pages where databases can be created
- **Response**: Array of pages with id, title, url
- **Auth**: Requires Notion auth token

### 2. GET /notion/config
- **Purpose**: Get current database configuration for the user
- **Response**: Object with database IDs for each event type (Customer, Invoice, Quote, Charge)
- **Auth**: Requires Stripe account/user context

### 3. POST /notion/config
- **Purpose**: Save database configuration for the user
- **Body**: Object with database IDs for each event type
- **Auth**: Requires Stripe account/user context

### 4. POST /notion/databases/create
- **Purpose**: Create new databases in specified Notion page
- **Body**: { pageId: string, eventTypes: string[] }
- **Response**: Object with created database IDs for each event type
- **Auth**: Requires Notion auth token

### 5. GET /notion/databases
- **Purpose**: Get list of user's existing Notion databases
- **Response**: Array of databases with id, title, properties
- **Auth**: Requires Notion auth token

## Notes
- All endpoints should handle Notion API rate limits
- Database creation should include proper schema for each event type
- Configuration should be scoped to Stripe account