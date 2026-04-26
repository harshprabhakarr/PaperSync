const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/'))); // Serve frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Simple JSON Database setup
const DB_FILE = path.join(__dirname, 'db.json');

const defaultData = {
  papers: [
    {
      id: 'p1',
      title: 'Attention Is All You Need',
      authors: 'Ashish Vaswani, et al.',
      year: '2017',
      abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...',
      tags: ['AI', 'Transformers', 'NLP'],
      ext: 'PDF',
      dateAdded: Date.now() - 86400000 * 5,
      collectionId: 'c1',
      filename: null,
      content: `
        <div class="paper-section">
          <h2>Abstract</h2>
          <p>The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.</p>
        </div>
      `
    }
  ],
  annotations: [],
  collections: [
    { id: 'c1', name: 'Machine Learning Basics', desc: 'Core papers for ML foundation', color: '#6C63FF', count: 1 }
  ]
};

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Multer storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// --- API ROUTES ---

// Papers
app.get('/api/papers', (req, res) => {
  const db = readDB();
  res.json(db.papers);
});

app.post('/api/papers', upload.single('file'), (req, res) => {
  const db = readDB();
  const paperData = JSON.parse(req.body.paperData);
  
  const newPaper = {
    ...paperData,
    id: 'p' + Date.now(),
    filename: req.file ? req.file.filename : null,
    dateAdded: Date.now()
  };

  db.papers.unshift(newPaper);
  writeDB(db);
  res.status(201).json(newPaper);
});

// Annotations
app.get('/api/annotations', (req, res) => {
  const db = readDB();
  res.json(db.annotations);
});

app.post('/api/annotations', (req, res) => {
  const db = readDB();
  const newAnn = {
    ...req.body,
    id: 'a' + Date.now(),
    date: Date.now()
  };
  db.annotations.push(newAnn);
  writeDB(db);
  res.status(201).json(newAnn);
});

app.delete('/api/annotations/:id', (req, res) => {
  const db = readDB();
  db.annotations = db.annotations.filter(a => a.id !== req.params.id);
  writeDB(db);
  res.status(204).end();
});

// Collections
app.get('/api/collections', (req, res) => {
  const db = readDB();
  res.json(db.collections);
});

app.post('/api/collections', (req, res) => {
  const db = readDB();
  const newColl = {
    ...req.body,
    id: 'c' + Date.now(),
    count: 0
  };
  db.collections.push(newColl);
  writeDB(db);
  res.status(201).json(newColl);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
