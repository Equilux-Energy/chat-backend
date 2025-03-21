# 🔌 Equilux Energy Chat Backend ⚡

<div align="center">

![Equilux Energy](https://img.shields.io/badge/Equilux-Energy-brightgreen)
![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.6-blue)
![Express](https://img.shields.io/badge/Express-v4.18-lightblue)
![AWS DynamoDB](https://img.shields.io/badge/AWS-DynamoDB-orange)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/folder-server.svg" alt="Server" width="100" />
</div>

> *Powering the future of peer-to-peer energy trading with real-time communication*

A cutting-edge real-time messaging service that enables energy prosumers to exchange messages and negotiate energy trades on the Equilux Energy platform. Built with modern technologies for reliability, security, and scalability.

## ✨ Features

<table>
  <tr>
    <td>🔒 <b>Secure Authentication</b></td>
    <td>🔄 <b>Real-time Messaging</b></td>
    <td>⚡ <b>Energy Trade Offers</b></td>
  </tr>
  <tr>
    <td>💰 <b>Trade Negotiations</b></td>
    <td>📱 <b>Pagination Support</b></td>
    <td>🗂️ <b>Conversation Management</b></td>
  </tr>
  <tr>
    <td>☁️ <b>AWS Cloud-ready</b></td>
    <td>🐳 <b>Docker Support</b></td>
    <td>📈 <b>Scalable Architecture</b></td>
  </tr>
</table>

## 🛠️ Technology Stack

<div align="center">

| Backend | Database | Tools | Deployment |
|---------|----------|-------|------------|
| Node.js | DynamoDB | JWT | Docker |
| Express | AWS SDK | Socket.IO | AWS ECS/App Runner |
| Socket.IO | | ESLint | CI/CD Pipeline |

</div>

## 📋 Prerequisites

- Node.js 18.x or higher
- AWS account with DynamoDB access
- Docker (for containerized deployment)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/equilux-energy-chat-backend.git
cd equilux-energy-chat-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your AWS credentials and other settings

# Start the server
npm start
```

## 🔧 Environment Configuration

Create a .env file with the following variables:

```
PORT=8080
AWS_REGION="your-aws-region"
NODE_ENV="development"
JWT_SECRET="your-jwt-secret"
CLIENT_URL="http://localhost:3000"
```

<div align="center">
  
  **⚠️ SECURITY ALERT ⚠️**
  
</div>

> **IMPORTANT SECURITY NOTES:**
> - Never commit your .env file to version control
> - For production, use IAM roles instead of hardcoded AWS credentials
> - In AWS deployments, set environment variables through the service configuration
> - Rotate your JWT secret regularly

## 📂 Project Structure

```
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
├── .env.example          # Example environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project dependencies and scripts
└── README.md             # Project documentation
```

## 🌐 API Reference

### Messages Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/users` | Get all users for sidebar |
| GET | `/api/messages/conversations` | Get recent conversations |
| GET | `/api/messages/trades` | Get trade offers (with query params) |
| GET | `/api/messages/:id` | Get messages with a specific user |
| POST | `/api/messages/:id` | Send a message to a user |
| POST | `/api/messages/trades/:messageId/respond` | Respond to a trade offer |

## 💻 Development

```bash
# Start in development mode with auto-reload
npm run dev

# Lint code
npm run lint

# Run tests
npm test
```

## 🐳 Docker Deployment

```bash
# Build Docker image
docker build -t equilux-chat-api .

# Run container locally
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e AWS_REGION="eu-west-1" \
  -e NODE_ENV="production" \
  equilux-chat-api
```

## ☁️ AWS Deployment Options

<details>
<summary><b>App Runner Deployment</b> (Click to expand)</summary>

1. Build and push Docker image to ECR
   ```bash
   aws ecr get-login-password --region YOUR_REGION | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com
   aws ecr create-repository --repository-name equilux-chat-api
   docker tag equilux-chat-api:latest YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/equilux-chat-api:latest
   docker push YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/equilux-chat-api:latest
   ```
2. Create App Runner service using the ECR image
3. Configure environment variables in App Runner service
</details>

<details>
<summary><b>ECS with Fargate Deployment</b> (Click to expand)</summary>

1. Push Docker image to ECR (same steps as above)
2. Create ECS cluster, task definition, and service
3. Configure environment variables in task definition
</details>

## 🧪 Testing API Endpoints

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

## 🔄 Socket.IO Events

| Event | Description |
|-------|-------------|
| `connect` | Client connects to server |
| `newMessage` | New message received |
| `tradeResponse` | Response to a trade offer |
| `typing` | User is typing |
| `stopTyping` | User stopped typing |

## 🔐 Security Best Practices

- Use IAM roles for AWS authentication in production
- Secure Socket.IO connections with proper authentication
- Implement rate limiting for API endpoints
- Validate all user inputs
- Use HTTPS in production
- Keep dependencies updated regularly

## 💾 DynamoDB Table Design

### Messages Table
```
Partition Key: conversationId (composite key of user IDs)
Sort Key: timestamp
GSI1: senderId (Partition) + timestamp (Sort)
GSI2: receiverId (Partition) + timestamp (Sort)
```

## 🛣️ Roadmap

- [ ] Implement end-to-end encryption for messages
- [ ] Add support for message attachments
- [ ] Create a dashboard for trade analytics
- [ ] Implement webhooks for external integrations
- [ ] Add multi-language support

## 🔍 Troubleshooting

<details>
<summary><b>Common Issues</b></summary>

- **Connection issues**: Ensure proper CORS configuration
- **Socket disconnects**: Check client heartbeat settings
- **Database errors**: Verify AWS credentials and permissions
- **Performance issues**: Enable DynamoDB auto-scaling
</details>

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributors

__Mahmoud Kebbi__ - *Lead Developer*

---

<div align="center">
  <h3>🌟 Equilux Energy: Building the Decentralized Energy Future 🌟</h3>
  <p>For questions, feature requests, or bug reports, please open an issue on the repository</p>
</div>