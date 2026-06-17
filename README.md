# AI-Powered Matchmaking Platform for Exporters & Importers

Welcome to the **B2B Global Trade Matchmaking Platform**! This project is an advanced, production-ready full-stack application that leverages Artificial Intelligence to seamlessly connect global exporters with matching importers based on comprehensive data analytics, geospatial awareness, and market intelligence.

---

## Table of Contents

* [Project Overview](https://www.google.com/search?q=%23project-overview)
* [Key Features](https://www.google.com/search?q=%23key-features)
* [Architecture & Tech Stack](https://www.google.com/search?q=%23architecture--tech-stack)
* [Project Structure](https://www.google.com/search?q=%23project-structure)
* [Installation & Local Development](https://www.google.com/search?q=%23installation--local-development)
* [Environment Variables](https://www.google.com/search?q=%23environment-variables)
* [Deployment](https://www.google.com/search?q=%23deployment)

---

## Project Overview

This application optimizes the international trade supply chain by intelligently matching exporters with prospective buyers (importers). Built with a sophisticated split architecture, it utilizes a Python-based Machine Learning service to rank compatibility using factors such as:

* Tariff impacts & Currency shifts
* Natural calamity risks & Market impacts
* Intent scoring & Bayesian historical weights

It also features a robust, responsive React dashboard that provides users with actionable market intelligence, visual data analytics, and interactive global maps.

---

## Key Features

* **AI-Driven Matchmaking Engine:** A robust Python backend utilizing `scikit-learn`, `pandas`, and Bayesian weighting to score and rank export/import matches intelligently based on industry, geographic multipliers, and risk factors.
* **Geospatial Maps Integration:** Interactive mapping powered by **Leaflet (`react-leaflet`)** to visualize trade routes, exporter/importer locations, and regional market intelligence.
* **Intuitive Analytics Dashboard:** A comprehensive, white-themed dashboard built with `Recharts` for real-time visualization of daily, weekly, and yearly trade metrics.
* **Real-Time Exploratory Tools:** Features like "Explore Importers" and "Export Matches," equipped with interactive modals to seamlessly connect with potential trading partners.
* **Role-Based Access & Authentication:** Dedicated interfaces for both Exporters and Importers to manage their profiles, recent interactions, and pending deals.
* **ATS-Friendly Code & UX:** Designed with best practices in mind, showcasing modern architectural decisions, clean code standards, and seamless user experiences.

---

## Architecture & Tech Stack

This project follows a modern **Split Architecture** pattern:

### **Frontend (Client)**

* **Framework:** React 18 (SPA approach with React Router 6)
* **Build Tool:** Vite
* **Language:** TypeScript
* **Styling:** TailwindCSS 3 + Radix UI components + Lucide Icons
* **Data & Maps:** TanStack Query (React Query), Recharts, React-Leaflet

### **API Gateway (Server)**

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database ORM:** Mongoose / MongoDB
* **Purpose:** Manages authentication, user data, data marshaling, and acts as a gateway to the ML service.

### **Machine Learning Service (Python)**

* **Language:** Python 3
* **Libraries:** `pandas`, `numpy`, `scikit-learn`
* **Purpose:** Executes advanced matching pipelines (`backend.py`, `ml_weights.py`, `feature_engineering.py`), applies MinMaxScaler, and processes PCA & Bayesian weights.

---

## Project Structure

```text
Epsilon_LOC8AI1/
├── client/                 # React SPA frontend
│   ├── components/         # Reusable UI elements (Radix + Tailwind)
│   ├── pages/              # Application views (Dashboard, Login, Explore, etc.)
│   ├── App.tsx             # React Router configuration
│   └── global.css          # Global Tailwind styles
├── server/                 # Express API Node.js Gateway & Python ML Service
│   ├── routes/             # API routes
│   ├── backend.py          # Python Matchmaking logic
│   ├── ml_service.py       # ML API Gateway hooks
│   ├── data_cleaning.py    # Python Preprocessing scripts
│   └── index.ts            # Node API entrypoint
├── shared/                 # Shared TypeScript interfaces & types
└── package.json            # Node dependencies and npm scripts

```

---

## Installation & Local Development

### Prerequisites

* [Node.js](https://nodejs.org/) (v18+ recommended)
* [Python 3](https://www.python.org/)
* [PNPM](https://pnpm.io/) or NPM

### Setup Instructions

1. **Install Node Dependencies:**
```bash

```



pnpm install

# or

npm install

```

2. **Install Python Dependencies:**
   Navigate into the project root and install the required ML packages:
   ```bash
pip install -r server/requirements.txt

```

*(We recommend using a virtual environment: `python -m venv venv`)*

3. **Start the Development Servers:**
The project is heavily integrated using Vite and concurrently runs the backend and frontend.
```bash

```



npm run dev

```
   *This command will start the Vite frontend server and trigger the backend data integrations. Note: Verify any Python microservices scripts (e.g., `uvicorn` or `flask` if exposed manually) are running if testing ML features in isolation.*

---

## Environment Variables
Create a `.env` file in the root directory and ensure the necessary keys are configured (do not commit your `.env`!). The system generally expects:
```env
PORT=8080
# MongoDB URI if running real DB instead of mocked jsons
MONGO_URI=mongodb+srv://<username>:<password>@cluster.xyz.mongodb.net/
# Any third party API keys

```

---

## Deployment

The unified system is designed for flexibility across modern cloud providers, specifically tailored for separate host environments given the split architecture.

* **Frontend:** Optimized for deployment on platforms like **Vercel** or **Netlify**. Run `npm run build:client` to generate the static files.
* **Backend (Node & Python):** Optimized for deployment on platforms like **Render** or **Railway**. The `Procfile` and `package.json` build scripts specifically cater to installing both Node and Python requirements in the cloud.

---

## Contributing

Contributions, issues, and feature requests are welcome!

Feel free to check out the [issues page](https://www.google.com/search?q=%23) to see upcoming features or to report bugs.
