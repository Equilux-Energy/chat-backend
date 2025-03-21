# Equilux Energy Chat Backend

A real-time messaging service that supports both standard text messages and energy trade offers between prosumers. Built with Node.js, Express, Socket.IO, and AWS DynamoDB.

## Features

- 🔒 Secure user authentication
- 💬 Real-time messaging using Socket.IO
- ⚡ Energy trade offers with pricing and scheduling
- 💰 Trade offer negotiations (accept/reject/counter)
- 📱 Pagination for message history
- 🗂️ Conversation management
- ☁️ Cloud-ready with AWS DynamoDB storage
- 🐳 Docker support for easy deployment

## Technologies

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **Socket.IO**: Real-time bidirectional communication
- **AWS SDK**: DynamoDB integration
- **JWT**: Authentication
- **Docker**: Containerization

## Prerequisites

- Node.js 18.x or higher
- AWS account with DynamoDB access
- Docker (for containerized deployment)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/equilux-energy-chat-backend.git
cd equilux-energy-chat-backend

# Install dependencies
npm install

# Set up environment variables
cp [.env.example](http://_vscodecontentref_/0) .env
# Edit .env file with your AWS credentials and other settings

# Start the server
npm start
```

## Environment Variables

Create a .env file with the following variables

```JSON
PORT=8080
AWS_REGION="your-aws-region"
NODE_ENV="development"
JWT_SECRET="your-jwt-secret"
CLIENT_URL="http://localhost:3000"
```

> **_IMPORTANT:_** 
> - Never commit your .env file to version control
> - For production, use IAM roles instead of hardcoded AWS credentials
> - In AWS deployments, set environment variables through the service configuration

## Project Structure

```js
chat-backend/
│
├── src/                  # Source code
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── lib/              # Utilities and libraries
│   ├── routes/           # API routes
│   ├── middlewares/      # Express middlewares
│   ├── app.js            # Express app setup
│   └── index.js          # Application entry point
│
├── Dockerfile            # Docker configuration
├── .dockerignore         # Files to exclude from Docker build
├── [.env.example](http://_vscodecontentref_/1)          # Example environment variables
├── .gitignore            # Git ignore file
├── [package.json](http://_vscodecontentref_/2)          # Project dependencies and scripts
└── [README.md](http://_vscodecontentref_/3)             # Project documentation
```
## API Endpoints

### Messages

* GET /api/messages/users - Get all users for sidebar
* GET /api/messages/conversations - Get recent conversations
* GET /api/messages/trades - Get trade offers (filter with query params)
* GET /api/messages/:id - Get messages with a specific user
* POST /api/messages/:id - Send a message to a user
* POST /api/messages/trades/:messageId/respond - Respond to a trade offer

## Development

```bash
# Start in development mode with auto-reload
npm run dev

# Lint code
npm run lint

# Run tests
npm test
```

## Docker

```bash
# Build Docker image
docker build -t equilux-chat-api .

# Run container
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e AWS_REGION="eu-west-1" \
  -e NODE_ENV="production" \
  equilux-chat-api
```


## Testing API

### Using PowerShell

```powershell
# Setup auth token
$token = "YOUR_JWT_TOKEN"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Get messages
Invoke-RestMethod -Uri "http://localhost:8080/api/messages/USER_ID" -Method Get -Headers $headers

# Send a trade offer
$body = @{
    text = "Energy trade proposal"
    messageType = "tradeOffer"
    pricePerUnit = 0.15
    startTime = "2025-03-20T14:00:00.000Z"
    totalAmount = 50
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/messages/RECIPIENT_ID" -Method Post -Headers $headers -Body $body
```


## Socket.IO Events

* connect - Client connects to * server
* newMessage - New message * received
* tradeResponse - Response to a * trade offer
* typing - User is typing
* stopTyping - User stopped typing

## Security Considerations

* Use IAM roles for AWS authentication in production
* Secure Socket.IO connections with proper authentication
* Implement rate limiting for API endpoints
* Validate all user inputs
* Use HTTPS in production
* Keep dependencies updated

## DynamoDB Table Design

### Message Table

* Partition Key: conversationId (composite key of user IDs)
* Sort Key: timestamp
* GSI1: senderId (Partition) + timestamp (Sort)
* GSI2: receiverId (Partition) + timestamp (Sort)

## License
**MIT License**

## Contributers
__Mahmoud Kebbi__