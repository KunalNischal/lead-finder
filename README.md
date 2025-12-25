# Auto Lead Allocator

Automatically fetches new leads from Surya Loan CRM and allocates them to your bucket.

## Features

- ✅ Periodically checks for new leads (every 60 seconds by default)
- ✅ Identifies new leads by comparing with existing ones
- ✅ Automatically allocates new leads to your bucket
- ✅ Detailed logging of all actions
- ✅ Configurable check interval
- ✅ Manual mode (notification only) or auto-allocate mode

## Installation

1. Make sure you have Node.js installed (v14 or higher)
2. Install dependencies:

```bash
npm install
```

## Configuration

Before running the script, you need to configure your session details:

### Method 1: Extract Session Cookie from Browser

1. Open the Surya Loan website in your browser
2. Login to your account
3. Open Developer Tools (F12)
4. Go to the "Application" or "Storage" tab
5. Find "Cookies" under Storage
6. Copy the cookie value
7. Update `auto-allocate-leads.js`:

```javascript
const CONFIG = {
    COOKIES: 'your_session_cookie_here',
    CSRF_TOKEN: 'your_csrf_token_here',
    AUTO_ALLOCATE: true, // Set to false for manual mode
    CHECK_INTERVAL: 60000 // 60 seconds
};
```

### Method 2: Extract from Network Tab

1. Open Developer Tools (F12)
2. Go to "Network" tab
3. Reload the page
4. Click on any request to `crmsl.com`
5. Copy the entire "Cookie" header value
6. Copy the "csrf_token" from the request payload

## Usage

### Start the script:

```bash
npm start
```

### For development (auto-restart on changes):

```bash
npm run dev
```

### Configuration Options

Edit the `CONFIG` object in `auto-allocate-leads.js`:

```javascript
const CONFIG = {
    CHECK_INTERVAL: 60000,     // Check every 60 seconds
    AUTO_ALLOCATE: true,       // Auto-allocate new leads
    CSRF_TOKEN: '...',         // Your CSRF token
    COOKIES: '...'             // Your session cookie
};
```

## How It Works

1. **Initialize**: Fetches current leads and stores their IDs
2. **Monitor**: Checks for new leads at the configured interval
3. **Detect**: Compares current leads with stored IDs to find new ones
4. **Notify**: Logs new lead information to console
5. **Allocate**: Automatically allocates new leads to your bucket (if enabled)
6. **Update**: Updates the stored lead IDs

## Output Example

```
============================================================
   🚀 AUTO LEAD ALLOCATOR STARTED
============================================================

2025-12-25 10:30:00 [INFO] Initializing existing leads...
2025-12-25 10:30:01 [SUCCESS] Initialized with 15 existing lead(s)
2025-12-25 10:30:01 [INFO] Auto-allocate: ENABLED ✓
2025-12-25 10:30:01 [INFO] Check interval: 60 seconds

2025-12-25 10:30:01 [INFO] Check #1 - Fetching current lead list...
2025-12-25 10:30:02 [INFO] Found 15 total lead(s) in the list
2025-12-25 10:30:02 [INFO] No new leads found

2025-12-25 10:31:01 [INFO] Check #2 - Fetching current lead list...
2025-12-25 10:31:02 [INFO] Found 17 total lead(s) in the list
2025-12-25 10:31:02 [SUCCESS] 🎯 Found 2 NEW lead(s)!
2025-12-25 10:31:02 [INFO]   → New Lead: SL12345
2025-12-25 10:31:02 [INFO]   → New Lead: SL12346
2025-12-25 10:31:02 [INFO] Attempting to allocate 2 lead(s)...
2025-12-25 10:31:03 [SUCCESS] Successfully allocated 2 lead(s) to your bucket!
2025-12-25 10:31:03 [SUCCESS]   ✓ Lead ID: SL12345
2025-12-25 10:31:03 [SUCCESS]   ✓ Lead ID: SL12346
```

## Stopping the Script

Press `Ctrl+C` to stop the script gracefully.

## Security Notes

⚠️ **Important Security Considerations:**

1. Never commit your session cookies or CSRF tokens to version control
2. Keep your credentials secure
3. The session will expire - you'll need to update cookies periodically
4. Consider using environment variables for sensitive data

## Troubleshooting

### "No session cookies provided"
- Make sure you've set the `COOKIES` value in the CONFIG

### "Login failed"
- Your session may have expired - get a fresh cookie from the browser

### "Error fetching lead list"
- Check your internet connection
- Verify the BASE_URL is correct
- Ensure your session is still valid

### "Allocation failed"
- Check if you have permission to allocate leads
- Verify the CSRF token is current
- Check the console for specific error messages

## Advanced Usage

### Running as a Background Service (Windows)

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Start the script with PM2:
```bash
pm2 start auto-allocate-leads.js --name "lead-allocator"
```

3. Set to start on system boot:
```bash
pm2 startup
pm2 save
```

### Running on a Schedule

You can also run this script on a schedule using Task Scheduler (Windows) or cron (Linux/Mac).

## License

ISC
