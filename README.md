<div align="center">

# SchoolBook

**A focused AI study workspace that turns PDFs and notes into resources you can actually use.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-663399?style=for-the-badge&logo=css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=222222)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white)

</div>

## Overview

SchoolBook is a beginner-friendly, browser-based study assistant inspired by NotebookLM-style workflows. Add a PDF or paste study text, then organise the material into useful learning resources and ask focused questions through an AI chat.

The frontend remains plain HTML, CSS, and JavaScript. A small Node.js server keeps Gemini credentials private and acts as the API bridge.

## Main features

- Upload PDFs or paste text directly
- Generate flashcards and study progress
- Create concise smart notes
- Extract key points and important questions
- Produce topic summaries
- Chat with follow-up questions about selected material
- Switch between light and dark themes
- Store materials and conversations locally in the browser

## How it works

```text
Browser
  │
  ├── Upload or paste study material
  ├── PDF text extraction
  └── REST requests
          │
          ▼
  Node.js API server
          │
          ├── Gemini API authentication
          ├── Request caching
          └── Gemini API
```

Study resources are generated with one request. Extracted material is reused for chat, and generated results are cached to reduce API requests and token use.

## Project structure

```text
school-book/
├── index.html          Dashboard and application interface
├── css/
│   └── style.css       Layout, components, themes, and responsiveness
├── js/
│   ├── app.js          Application state and user interactions
│   └── theme.js        Saved theme preference
├── server.js           Static server and secure Gemini API endpoints
├── .env.example        Example server environment variables
├── .gitignore          Local secrets and generated files
└── package.json        Node.js start scripts
```

## Getting started

### Requirements

- Node.js 18 or newer
- A Google Gemini API key

### 1. Clone the project

## Project Structure

```
school-book/
|-- index.html
|-- notes.html
|-- flashcards.html
|-- focus.html
|-- important_points.html
|-- settings.html
|-- css/
|   |-- style.css
|   |-- themes.css
|-- js/
|   |-- main.js
|   |-- notes.js
|   |-- flashcards.js
|   |-- timer.js
|   |-- theme.js
|-- images/
|-- README.md
```

## Getting Started
>>>>>>> c513052f2d3b3487ba01f1081ff4ff6b44a6a75d

```bash
git clone https://github.com/hey-ameerhamza/school-book.git
cd school-book
```

### 2. Configure the API key

Copy the example environment file:

```bash
cp .env.example .env
```

Add your key to `.env`:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
```

> **Security:** Never place an API key in HTML or JavaScript files. `.env` is excluded by `.gitignore` and should never be committed.

### 3. Start the application

<<<<<<< HEAD
```bash
npm start
```
=======
| Member | Role |
| --- | --- |
| **M. Ameer Hamza** | HTML, CSS, JavaScript development, team lead and research |
| **Umar Ahmad Khan** | Editing, research, LaTeX and project storyteller |
| **M. Waris Shah** | LaTeX (Overleaf), HTML, CSS and research |
>>>>>>> c513052f2d3b3487ba01f1081ff4ff6b44a6a75d

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/status` | Check whether Gemini is configured |
| `POST` | `/api/generate-learning-resources` | Generate all learning resources in one request |
| `POST` | `/api/chat` | Answer questions about selected study material |

## Efficient Gemini usage

SchoolBook is designed to minimise free-quota usage:

- One learning-resource request processes the material once
- Flashcards, notes, points, summaries, and questions are returned together
- Repeated resource requests use cached results
- Chat prompts reuse extracted material stored on the server
- Browser and server caches avoid sending identical requests
- Prompt and response sizes are limited

## Data and privacy

- Materials and chat history are stored in browser `localStorage`
- API calls pass through the Node.js server
- The Gemini key is never sent to or embedded in frontend code
- Clearing local data in Settings removes saved browser study data

## Development

There is no framework build step or package installation required for the frontend.

```bash
npm start
```

To stop the server, press `Ctrl+C` in the terminal.

## License

Add a license file before distributing or publishing this project publicly.
