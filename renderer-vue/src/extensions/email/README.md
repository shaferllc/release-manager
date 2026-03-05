# Email extension

Catch outgoing emails from your app with a local SMTP server. Point your app’s mail config at this server and view messages in the app.

## Manual testing

1. **Enable the extension**  
   Open **Extensions** (sidebar), find **Email**, and turn it **Enabled**.

2. **Open the Email tab**  
   Select any project, then open the **Email** detail tab.

3. **Start the SMTP server**  
   Click **Start SMTP server**. The server listens on `127.0.0.1` (default port 1025). The UI shows the connection details.

4. **Send a test email**  
   With the server running, click **Send test email**. A sample message is sent to the catch server and appears in the inbox. Use this to confirm the server and UI (list, HTML/text/raw/headers view) work without an external app.

5. **Test with your app**  
   Configure your app to use this server, for example:
   - **Laravel**: `MAIL_HOST=127.0.0.1`, `MAIL_PORT=1025`, `MAIL_USERNAME=null`, `MAIL_PASSWORD=null`, `MAIL_ENCRYPTION=null`
   - **Node (nodemailer)**: `host: '127.0.0.1', port: 1025, secure: false`
   - **CLI**: `echo -e "Subject: test\n\nbody" | nc -q 1 127.0.0.1 1025` (or use `swaks` if installed)

6. **Stop and clear**  
   Use **Stop** to shut down the server and **Clear all** to remove caught emails from the inbox.
