import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Load OAuth credentials
const OAUTH_CREDENTIALS_PATH = path.join(process.cwd(), 'credentials_oauth.json');

// The Shared Folder ID provided by the user
const ROOT_FOLDER_ID = '1keiEChZOEX6iC7AocwALjrNGnmpjhdA3';

let authClient: any = null;

async function getAuthClient() {
    if (authClient) return authClient;

    let clientId, clientSecret, refreshToken;

    // Try loading from JSON file first
    if (fs.existsSync(OAUTH_CREDENTIALS_PATH)) {
        try {
            const fileContent = fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf-8');
            // Parse line by line "KEY=VALUE" format since we saved it as .env style
            const envConfig: any = {};
            fileContent.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    envConfig[key] = value;
                }
            });

            clientId = envConfig.GOOGLE_CLIENT_ID;
            clientSecret = envConfig.GOOGLE_CLIENT_SECRET;
            refreshToken = envConfig.GOOGLE_REFRESH_TOKEN;
        } catch (e) {
            console.error('Error reading OAuth credentials file:', e);
        }
    }

    // Fallback to environment variables if not found in file or file doesn't exist
    clientId = clientId || process.env.GOOGLE_CLIENT_ID;
    clientSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    refreshToken = refreshToken || process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('OAuth Credentials not found. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.');
    }

    const { OAuth2 } = google.auth;
    const client = new OAuth2(clientId, clientSecret);

    client.setCredentials({
        refresh_token: refreshToken
    });

    authClient = client;
    return authClient;
}

/**
 * Find or create a folder inside the parent folder.
 * Returns the folder ID.
 */
async function findOrCreateFolder(folderName: string, parentId: string = ROOT_FOLDER_ID): Promise<string> {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Check if folder exists
    const query = `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    try {
        const res = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (res.data.files && res.data.files.length > 0) {
            // Folder exists
            return res.data.files[0].id!;
        }

        // Create folder
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        };

        const file = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
        });

        return file.data.id!;
    } catch (error) {
        console.error('Error finding/creating folder:', error);
        throw error;
    }
}

/**
 * Upload a file to a specific folder.
 * Returns the webViewLink (public link if shared properly) and file ID.
 */
export async function uploadFileToDrive(filePath: string, fileName: string, folderName: string) {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    try {
        // 1. Get/Create folder ID
        const folderId = await findOrCreateFolder(folderName);

        // 2. Upload file
        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: 'application/octet-stream', // Generic binary
            body: fs.createReadStream(filePath),
        };

        const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // 3. Make the file "Viewer" accessible to anyone with key? 
        // User requested "anyone with link can view" but that generally requires making it public
        // or relying on the parent folder's permission inheritance.
        // If the parent folder (ROOT_FOLDER_ID) is shared as "Anyone with link -> Viewer", 
        // child files should inherit.

        // Ensure permission inheritance (usually automatic, but let's be safe)
        // Actually, we rely on the Root Folder's permission settings.

        return {
            fileId: file.data.id,
            webViewLink: file.data.webViewLink,
            webContentLink: file.data.webContentLink
        };

    } catch (error) {
        console.error('Error uploading to Drive:', error);
        throw error;
    }
}
