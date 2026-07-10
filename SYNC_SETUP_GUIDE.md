# Electron to React Native Database Sync Setup Guide

## Overview
This system allows your React Native app to securely sync with your Electron app's SQLite database (`data.db`). The sync process ensures that the main database file is never stored permanently on third-party devices - it's only temporarily transferred and automatically cleaned up.

## Architecture
- **Electron EXE**: Contains the main database and sync handlers via IPC
- **Electron Backend API**: Exposes secure API endpoints and communicates with Electron EXE via HTTP bridge
- **React Native App**: Calls Backend API to download and read the database temporarily
- **Security**: API key authentication + temporary tokens + auto-cleanup + Electron EXE integration

## Backend Setup (Electron Backend API)

### 1. Add Environment Variables
Add these to your `.env` file:
```env
SYNC_API_KEY=your_secure_random_api_key_here
ELECTRON_HOST=localhost
ELECTRON_SYNC_PORT=3001
```

Generate a secure key using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Files Created/Updated
- `services/electronBridge.js` - HTTP bridge to communicate with Electron EXE
- `API/sync/syncController.js` - Updated sync logic with Electron EXE integration
- `API/sync/syncRouter.js` - Updated sync API routes with new endpoints
- `middleware/syncAuth.js` - API key authentication middleware
- `server.js` - Updated to include sync routes
- `config.js` - Updated with Electron EXE configuration

### 3. Electron EXE Requirements
Your Electron EXE must be running and have the sync handlers implemented (see `ELECTRON_SYNC_INTEGRATION.txt`). The Electron EXE should expose HTTP endpoints for:
- `/api/sync/db-info` - Get database information
- `/api/sync/create-temp-db` - Create temporary database
- `/api/sync/get-temp-db` - Get temporary database path
- `/api/sync/cleanup-temp-db` - Cleanup specific temp database
- `/api/sync/cleanup-all-temp` - Cleanup all temp databases
- `/api/sync/tables` - Get tables from database
- `/api/sync/table-count` - Get table row count

### 4. API Endpoints
All endpoints require `x-sync-api-key` header:

- `POST /api/sync/initiate` - Start sync, returns token (communicates with Electron EXE)
- `GET /api/sync/download/:syncToken` - Download database file from Electron EXE
- `GET /api/sync/status/:syncToken` - Check sync status
- `GET /api/sync/db-info` - Get database information from Electron EXE
- `GET /api/sync/tables/:syncToken` - Get tables from database
- `GET /api/sync/table/:syncToken/:tableName` - Get table data preview

### 5. Security Features
- API key authentication required for all requests
- Unique sync tokens for each request
- Temporary files auto-delete after download
- Periodic cleanup of old temp files (30 min intervals)
- 1-hour token expiration
- Electron EXE integration with automatic decryption
- No direct access to main database file

### 6. Start Services
```bash
# Start Electron EXE first (must be running for sync to work)
cd ../Electron
npm start

# Then start Backend API
cd ../Electron_Backend
npm run dev
```

## React Native Setup

### 1. Install Dependencies
```bash
npm install expo-file-system expo-sqlite
# or
yarn add expo-file-system expo-sqlite
```

### 2. Copy Files to React Native Project
Copy these files from your Electron backend to your React Native project:
- `REACT_NATIVE_SYNC_SERVICE.js` - Sync service class (updated for new architecture)
- `REACT_NATIVE_USAGE_EXAMPLE.js` - Usage example component

### 3. Configure Sync Service
In your React Native app, configure the sync service:
```javascript
import syncService from './REACT_NATIVE_SYNC_SERVICE';

syncService.configure(
  'http://YOUR_BACKEND_API_IP:3000', // Your Backend API URL (not Electron EXE)
  'your_secure_random_api_key_here'  // Same as backend SYNC_API_KEY
);
```

### 4. Use the Sync Service
```javascript
// Perform complete sync
const result = await syncService.performSync();

// Access the database
const tables = await syncService.getTables();
const data = await syncService.getTableData('your_table_name');

// Clean up when done
await syncService.cleanup();
```

## Sync Workflow

### Step 1: Initiate Sync
React Native calls `/api/sync/initiate` → Backend checks Electron EXE availability → Backend requests Electron EXE to create temp DB → Returns sync token

### Step 2: Download Database
React Native calls `/api/sync/download/:syncToken` → Backend retrieves temp DB path from Electron EXE → Backend sends file from Electron EXE → React Native saves to temp location

### Step 3: Read Data
React Native opens and reads the SQLite database → Displays data in app

### Step 4: Cleanup
React Native calls `cleanup()` → Deletes local temp files → Backend requests Electron EXE to cleanup temp DB → Auto-cleanup runs periodically

## Security Considerations

✅ **Secure Features:**
- API key authentication prevents unauthorized access
- Temporary tokens expire after 1 hour
- Files auto-delete after download
- No permanent storage of main database on third-party devices
- Electron EXE integration with encrypted database support
- Automatic decryption in Electron EXE (main DB stays encrypted)
- HTTPS recommended for production

⚠️ **Important:**
- Keep `SYNC_API_KEY` secret and never commit to git
- Use HTTPS in production
- Implement rate limiting if needed
- Consider adding user authentication for additional security

## Troubleshooting

### Backend Issues
- **Electron EXE not available**: Ensure Electron EXE is running and accessible at configured host/port
- **Database not found**: Ensure Electron EXE has `data.db` or `data.db.enc` file
- **API key errors**: Check `.env` file has `SYNC_API_KEY`
- **Port conflicts**: Ensure no other service using the same port for Backend API (3000) and Electron EXE sync server (3001)

### React Native Issues
- **Network errors**: Check backend URL is accessible from device
- **File system errors**: Ensure proper permissions for file operations
- **SQLite errors**: Verify expo-sqlite is properly installed

### CORS Issues
If you encounter CORS errors, update `server.js`:
```javascript
app.use(cors({
    origin: '*', // Or specify your React Native app's domain
    credentials: true,
}));
```

## Production Deployment

### Backend
1. Use environment variables for all sensitive data
2. Enable HTTPS
3. Implement rate limiting
4. Add logging and monitoring
5. Consider adding user authentication

### React Native
1. Securely store API key (use expo-secure-store)
2. Handle network errors gracefully
3. Implement retry logic for failed syncs
4. Add progress indicators for large files

## File Structure After Setup

```
Electron_Backend/
├── API/
│   └── sync/
│       ├── syncController.js    # Updated with Electron EXE integration
│       └── syncRouter.js        # Updated with new endpoints
├── services/
│   └── electronBridge.js        # HTTP bridge to Electron EXE
├── middleware/
│   └── syncAuth.js
├── temp_sync/                   # Auto-created for temp files
├── server.js                    # Updated with sync routes
├── config.js                    # Updated with Electron EXE config
└── .env                         # Add SYNC_API_KEY, ELECTRON_HOST, ELECTRON_SYNC_PORT

Electron/
├── src/
│   └── main/
│       ├── syncHandlers.js      # IPC handlers for sync
│       └── index.js             # Updated with sync handlers
├── data.db                      # Main database (or data.db.enc)
└── temp_sync/                   # Auto-created for temp databases

React_Native_Project/
├── REACT_NATIVE_SYNC_SERVICE.js
├── REACT_NATIVE_USAGE_EXAMPLE.js
└── Your components...
```

## Testing

### Test Backend
```bash
# First ensure Electron EXE is running and has sync HTTP server

# Test initiate sync
curl -X POST http://localhost:3000/api/sync/initiate \
  -H "x-sync-api-key: your_api_key"

# Test download (replace token)
curl http://localhost:3000/api/sync/download/your_token \
  -H "x-sync-api-key: your_api_key" \
  --output test.db

# Test get tables
curl http://localhost:3000/api/sync/tables/your_token \
  -H "x-sync-api-key: your_api_key"
```

### Test React Native
Use the provided `REACT_NATIVE_USAGE_EXAMPLE.js` component to test the sync functionality.

## Support
For issues or questions, check:
- Backend logs for sync-related errors
- React Native console for client-side errors
- Network tab in React Native debugger for API calls
