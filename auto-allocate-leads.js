/**
 * Auto Lead Allocator - Node.js Script
 * Automatically fetches new leads and allocates them to your bucket
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// ======================== CONFIGURATION ========================
const CONFIG = {
    // Your login credentials and session
    BASE_URL: 'https://crmsl.com',
    CSRF_TOKEN: 'd43e9604b013ac3004ffa27b39850b44', // Update this with your current token
    COOKIES: 'csrf_cookie_name=d43e9604b013ac3004ffa27b39850b44; ci_session=tmk82cboqgpc5discrogahffao1ev5vi', // Will be set after login
    
    // Checking interval (in milliseconds)
    CHECK_INTERVAL: 700, // 0.7 seconds
    
    // Auto-allocate settings
    AUTO_ALLOCATE: true, // Set to false to only notify without allocating
    
    // User details
    USER_ID: '', // Will be extracted from session
    CUSTOMER_ID: '', // Will be extracted from session
    
    // Lead list endpoint
    LEAD_LIST_URL: '/GetLeadTaskList/S4',
    ALLOCATE_URL: '/allocateLeads'
};

// ======================== STATE MANAGEMENT ========================
let existingLeadIds = new Set();
let isProcessing = false;
let checkCount = 0;

// Create axios instance with custom config
const axiosInstance = axios.create({
    baseURL: CONFIG.BASE_URL,
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
    },
    httpsAgent: new https.Agent({
        rejectUnauthorized: false // For development only - remove in production
    })
});

// ======================== UTILITY FUNCTIONS ========================

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleString();
    const prefix = {
        info: '[INFO]',
        success: '[SUCCESS]',
        error: '[ERROR]',
        warning: '[WARNING]'
    }[type] || '[INFO]';
    
    console.log(`${timestamp} ${prefix} ${message}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================== AUTHENTICATION ========================

async function login(username, password) {
    try {
        log('Attempting to login...');
        
        const response = await axiosInstance.post('/login', {
            username: username,
            password: password,
            csrf_token: CONFIG.CSRF_TOKEN
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        // Extract cookies from response
        if (response.headers['set-cookie']) {
            CONFIG.COOKIES = response.headers['set-cookie']
                .map(cookie => cookie.split(';')[0])
                .join('; ');
            
            axiosInstance.defaults.headers.common['Cookie'] = CONFIG.COOKIES;
            log('Login successful!', 'success');
            return true;
        }
        
        log('Login failed - no session cookie received', 'error');
        return false;
        
    } catch (error) {
        log(`Login error: ${error.message}`, 'error');
        return false;
    }
}

// ======================== LEAD FETCHING ========================

async function fetchLeadList() {
    try {
        const response = await axiosInstance.get(CONFIG.LEAD_LIST_URL, {
            headers: {
                'Cookie': CONFIG.COOKIES
            }
        });
        
        return response.data;
        
    } catch (error) {
        log(`Error fetching lead list: ${error.message}`, 'error');
        return null;
    }
}

function parseLeadsFromHtml(html) {
    const $ = cheerio.load(html);
    const leads = [];
    
    // Parse the table rows
    $('#domainTable tbody tr').each((index, element) => {
        const $row = $(element);
        const leadId = $row.find('td:first').text().trim();
        const checkbox = $row.find('input.duplicate_id').val();
        
        // Skip if no valid lead ID
        if (leadId && leadId !== 'No Record Found...' && checkbox) {
            leads.push({
                leadId: leadId,
                checkboxValue: checkbox,
                row: $row.html()
            });
        }
    });
    
    return leads;
}

function findNewLeads(currentLeads) {
    const newLeads = [];
    
    currentLeads.forEach(lead => {
        if (!existingLeadIds.has(lead.leadId)) {
            newLeads.push(lead);
        }
    });
    
    return newLeads;
}

// ======================== LEAD ALLOCATION ========================

async function allocateLeads(leads) {
    try {
        const checkList = leads.map(lead => lead.checkboxValue);
        
        log(`Attempting to allocate ${checkList.length} lead(s)...`);
        
        const response = await axiosInstance.post(CONFIG.ALLOCATE_URL, {
            checkList: checkList,
            user_id: CONFIG.USER_ID,
            customer_id: CONFIG.CUSTOMER_ID,
            csrf_token: CONFIG.CSRF_TOKEN
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': CONFIG.COOKIES
            }
        });
        
        if (response.data && !response.data.err) {
            log(`Successfully allocated ${checkList.length} lead(s) to your bucket!`, 'success');
            
            // List the allocated lead IDs
            leads.forEach(lead => {
                log(`  ✓ Lead ID: ${lead.leadId}`, 'success');
            });
            
            return true;
        } else {
            log(`Allocation failed: ${response.data?.err || 'Unknown error'}`, 'error');
            return false;
        }
        
    } catch (error) {
        log(`Error allocating leads: ${error.message}`, 'error');
        return false;
    }
}

// ======================== MAIN CHECKING LOGIC ========================

async function checkForNewLeads() {
    if (isProcessing) {
        log('Previous check still processing, skipping...', 'warning');
        return;
    }
    
    isProcessing = true;
    checkCount++;
    
    log(`Check #${checkCount} - Fetching current lead list...`);
    
    try {
        // Fetch the current lead list
        const html = await fetchLeadList();
        
        if (!html) {
            log('Failed to fetch lead list', 'error');
            isProcessing = false;
            return;
        }
        
        // Parse leads from HTML
        const currentLeads = parseLeadsFromHtml(html);
        log(`Found ${currentLeads.length} total lead(s) in the list`);
        
        // Find new leads
        const newLeads = findNewLeads(currentLeads);
        
        if (newLeads.length > 0) {
            log(`🎯 Found ${newLeads.length} NEW lead(s)!`, 'success');
            
            // Display new lead IDs
            newLeads.forEach(lead => {
                log(`  → New Lead: ${lead.leadId}`, 'info');
            });
            
            // Auto-allocate if enabled
            if (CONFIG.AUTO_ALLOCATE) {
                const success = await allocateLeads(newLeads);
                
                if (success) {
                    // Update existing lead IDs after successful allocation
                    currentLeads.forEach(lead => existingLeadIds.add(lead.leadId));
                }
            } else {
                log('Auto-allocation is disabled. Please allocate manually.', 'warning');
                // Still update the existing leads list
                currentLeads.forEach(lead => existingLeadIds.add(lead.leadId));
            }
        } else {
            log('No new leads found');
            // Update existing leads list
            currentLeads.forEach(lead => existingLeadIds.add(lead.leadId));
        }
        
    } catch (error) {
        log(`Error during check: ${error.message}`, 'error');
    }
    
    isProcessing = false;
}

async function initializeExistingLeads() {
    log('Initializing existing leads...');
    
    const html = await fetchLeadList();
    if (html) {
        const leads = parseLeadsFromHtml(html);
        leads.forEach(lead => existingLeadIds.add(lead.leadId));
        log(`Initialized with ${existingLeadIds.size} existing lead(s)`, 'success');
    } else {
        log('Failed to initialize existing leads', 'error');
    }
}

// ======================== MAIN EXECUTION ========================

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('   🚀 AUTO LEAD ALLOCATOR STARTED');
    console.log('='.repeat(60) + '\n');
    
    // Check if cookies are provided
    if (!CONFIG.COOKIES) {
        log('No session cookies provided. Please login first.', 'error');
        log('You need to either:', 'info');
        log('1. Manually set CONFIG.COOKIES with your session cookie', 'info');
        log('2. Or implement the login() function with your credentials', 'info');
        process.exit(1);
    }
    
    // Set cookies in axios instance
    axiosInstance.defaults.headers.common['Cookie'] = CONFIG.COOKIES;
    
    // Initialize existing leads
    await initializeExistingLeads();
    
    // Display configuration
    log(`Auto-allocate: ${CONFIG.AUTO_ALLOCATE ? 'ENABLED ✓' : 'DISABLED ✗'}`);
    log(`Check interval: ${CONFIG.CHECK_INTERVAL / 1000} seconds`);
    log('');
    
    // Start checking
    log('Starting periodic checks...\n');
    
    // Initial check
    await checkForNewLeads();
    
    // Set up periodic checking
    setInterval(async () => {
        await checkForNewLeads();
    }, CONFIG.CHECK_INTERVAL);
    
    // Keep the script running
    log('\nPress Ctrl+C to stop\n');
}

// ======================== ERROR HANDLING ========================

process.on('unhandledRejection', (error) => {
    log(`Unhandled error: ${error.message}`, 'error');
});

process.on('SIGINT', () => {
    console.log('\n\n' + '='.repeat(60));
    log('Auto Lead Allocator stopped by user', 'warning');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
});

// ======================== START THE SCRIPT ========================

if (require.main === module) {
    main().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { checkForNewLeads, allocateLeads, login };
