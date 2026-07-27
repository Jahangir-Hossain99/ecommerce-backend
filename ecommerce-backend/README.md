# 🛒 E-Commerce Ordering & Payment System

A high-performance, robust, and scalable backend system built with **Node.js**, **Express.js**, **Prisma ORM**, and **PostgreSQL**. This project features JWT-based authentication, a **DFS-based Recommendation Engine**, **Redis Caching**, dynamic payment integrations (**Stripe** and **bKash**) using the **Strategy Pattern**, and safe atomic transactions for stock management.

---

## 🌟 Key Features

* **Authentication & Authorization:** JWT-based user authentication with Role-Based Access Control (Admin vs. User).
* **DFS Category Recommendation:** Depth-First Search algorithm to traverse nested sub-categories and recommend relevant products.
* **Performance Caching:** Integrated **Redis** caching for the category tree to minimize database hits.
* **Flexible Payment Strategy Pattern:** Modular design allowing dynamic payment routing between **Stripe** and **bKash**.
* **Atomic Stock Management:** Deterministic database transactions to handle checkout totals and safely decrement stock upon successful payment verification.
* **Containerized Deployment:** Fully dockerized backend service paired with PostgreSQL and Redis.
* **Automated Testing:** Unit and Integration tests written with **Jest** and **Supertest**.

---

## 🏗️ Architectural Overview

### 1. Payment Integration (Strategy Pattern)
The payment architecture utilizes the **Strategy Pattern** to separate core payment logic:
* **`PaymentStrategy`**: Base interface/class definition.
* **`StripeStrategy`**: Handles Stripe PaymentIntent creation and Webhook verification.
* **`BKashStrategy`**: Implements bKash tokenization, checkout creation, and execution callbacks.
* **`PaymentContext`**: Dynamically switches strategies at runtime based on the requested provider.

### 2. Category Traversal & Caching
* **DFS Algorithm**: Recursively gathers all child sub-category IDs under a requested parent category ID.
* **Redis Cache**: Saves the fetched category tree in memory with a Time-To-Live (TTL) of 1 hour to ensure ultra-fast lookup responses.

---

## 📊 System Diagrams

<details>
<summary>🗄️ Entity Relationship Diagram (ERD)</summary>

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    CATEGORIES ||--o{ CATEGORIES : "parent-child"
    CATEGORIES ||--o{ PRODUCTS : contains
    ORDERS ||--o{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : ordered_in
    ORDERS ||--o1 PAYMENTS : has
    
    USERS {
        bigint id PK
        string email UK
        string password
        string role
        timestamp created_at
    }
    CATEGORIES {
        bigint id PK
        string name
        bigint parent_id FK
    }
    PRODUCTS {
        bigint id PK
        string name
        string sku UK
        decimal price
        int stock
        string status
        bigint category_id FK
    }
    ORDERS {
        bigint id PK
        bigint user_id FK
        decimal total_amount
        string status
        timestamp created_at
    }
    ORDER_ITEMS {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        int quantity
        decimal price
        decimal subtotal
    }
    PAYMENTS {
        bigint id PK
        bigint order_id FK
        string provider
        string transaction_id UK
        string status
        json raw_response
        timestamp created_at
    }

    **System Architecture**

    graph TD
    Client[Vercel Frontend] -->|REST API Requests| Express[Node.js / Express Backend]
    StripeWebhook[Stripe Service] -->|Webhook Event| Ngrok[Ngrok Tunnel]
    bKashWebhook[bKash Service] -->|Webhook Event| Ngrok
    Ngrok --> Express
    subgraph Backend Architecture
        Express --> Strategy[Payment Strategy Manager]
        Strategy --> StripeClass[Stripe Strategy]
        Strategy --> bKashClass[bKash Strategy]
        
        Express --> DFS[DFS Recommendation Engine]
        DFS --> Redis[(Redis Cache)]
        DFS --> DB[(PostgreSQL)]
        Express --> DB
    End

  **Stripe Strategy Diagram**

    sequenceDiagram
    autonumber
    actor User
    participant Client as Frontend
    participant Server as Express Backend
    participant Stripe as Stripe API
    participant DB as Database
    User->>Client: Select Order & Pay via Stripe
    Client->>Server: POST /api/orders (provider: stripe)
    Server->>Stripe: Create PaymentIntent
    Stripe-->>Server: Return client_secret & transaction_id
    Server-->>Client: Return Order & Payment Details
    Client->>Stripe: Confirm Payment
    Stripe-->>Server: Async Webhook (payment_intent.succeeded)
    Server->>DB: Update Payment & Order Status to PAID
    Server->>DB: Safely Reduce Product Stock

      **BKash Strategy Diagram**

      sequenceDiagram
    autonumber
    actor User
    participant Client as Frontend
    participant Server as Express Backend
    participant bKash as bKash Gateway
    participant DB as Database
    User->>Client: Select Order & Pay via bKash
    Client->>Server: POST /api/orders (provider: bkash)
    Server->>bKash: Grant Token & Create Payment API
    bKash-->>Server: Return bkashURL & paymentID
    Server-->>Client: Redirect to bkashURL
    User->>bKash: Enter Wallet Number, OTP & PIN
    bKash->>Server: Callback with paymentID & status
    Server->>bKash: Call Execute Payment API
    bKash-->>Server: Payment Executed Successfully
    Server->>DB: Update Payment & Order Status to PAID
    Server->>DB: Safely Reduce Product Stock
    Server-->>Client: Redirect to Success Page
```
</details>

## 📁 Folder Structure

    src/
├── config/             # DB (Prisma) and Redis Client configurations
│   ├── prisma.js
│   └── redis.js
├── controllers/        # Route logic (Auth, Product, Order & Payments)
│   ├── authController.js
│   ├── productController.js
│   └── orderController.js
├── middlewares/        # Authentication & Role verification middlewares
│   └── auth.js
├── routes/             # REST API Endpoints
│   ├── authRoutes.js
│   ├── productRoutes.js
│   └── orderRoutes.js
└── services/           # Core business logic & algorithms
    ├── payment/        # Strategy Pattern (Stripe & bKash implementations)
    │   ├── PaymentStrategy.js
    │   ├── StripeStrategy.js
    │   ├── BKashStrategy.js
    │   └── PaymentContext.js
    └── recommendation/ # DFS Tree Traversal & Caching logic
        └── categoryDFS.js
---

## 🛠️ Tech Stack & Dependencies
Runtime: Node.js (v20+)

Framework: Express.js

Database: PostgreSQL (with Prisma ORM)

In-Memory Cache: Redis

Authentication: JSON Web Token (JWT) & Bcrypt

Payments: Stripe SDK & Axios (for bKash Checkout API)

Testing: Jest & Supertest

Containerization: Docker & Docker Compose
---

## 🚀 Getting Started
### 1. Prerequisites
Make sure you have installed:

Node.js (v20)

Docker Desktop

### 2. Environment Variables Setup
Create a .env file in the root folder and add the following config:

Code snippet
PORT=5000
DATABASE_URL="postgresql://postgres:root@localhost:5432/ecommerce_db?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_super_secret_jwt_key"
BACKEND_URL="http://localhost:5000"

# Stripe Credentials
STRIPE_SECRET_KEY="sk_test_..."

# bKash Sandbox Credentials
BKASH_APP_KEY="your_app_key"
BKASH_APP_SECRET="your_app_secret"
BKASH_USERNAME="your_username"
BKASH_PASSWORD="your_password"
BKASH_BASE_URL="[https://tokenized.sandbox.bKash.com/v1.2.0-beta](https://tokenized.sandbox.bKash.com/v1.2.0-beta)"


### 3. Local Installation & Database Setup
Bash
# Clone project
git clone <repository-url>
cd ecommerce-backend

# Install dependencies
npm install

# Run PostgreSQL & Redis via Docker
docker run --name ecommerce-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=root -e POSTGRES_DB=ecommerce_db -p 5432:5432 -d postgres:15-alpine
docker run --name ecommerce-redis -p 6379:6379 -d redis:7-alpine

# Database Migration & Client Generation
npx prisma migrate dev --name init
npx prisma generate

# Seed initial Data (Admin User, Categories & Sample Products)
npx prisma db seed

# Run Backend Server
npm start

🐳 Running with Docker Compose (Recommended)
To run the entire app stack (Backend App + PostgreSQL + Redis) seamlessly:


# Build and start all services
docker-compose up --build
# 🧪 Testing
Execute unit and integration tests using Jest:

npm test
---

## 📌 API Endpoints Summary

Method  	Endpoint	                                Description	                                Access
POST	    /api/auth/register	                        Register a new user	                        Public
POST	    /api/auth/login	                            Login user & return JWT token	            Public
GET	        /api/products	                            Get list of all products	                Public
GET	        /api/products/recommendations/:categoryId	DFS-based product recommendations	        Public
POST	    /api/products	                            Create a product	                        Admin
POST	    /api/orders	                                Create Order & initiate payment strategy	User/Admin
POST	    /api/orders/stripe-webhook	                Stripe payment completion listener	        Public
GET	        /api/orders/bkash-callback	                bKash payment verification callback	        Public

**API Testing From POSTMAN is in /docs/Ecommerce Backend API.postman_collection.json

