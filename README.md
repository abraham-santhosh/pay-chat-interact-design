# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/c9e3dcaf-f123-42b2-9105-fd7ccdfcff42

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c9e3dcaf-f123-42b2-9105-fd7ccdfcff42) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Express.js (Backend API)
- Nodemailer (Email notifications)

## 📧 Email Notification System

This application includes a comprehensive email notification system that sends alerts for group activities:

- ✅ Group creation notifications
- ✅ Member addition/removal alerts  
- ✅ Group deletion confirmations
- ✅ Beautiful HTML email templates
- ✅ Test endpoints for email configuration

See [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md) for detailed setup instructions.

## 🏦 UPI Payment Integration (Razorpay)

This project ships with a **production-ready Razorpay integration** that allows users to settle expenses via any UPI app.

### 1. Prerequisites

1. A Razorpay account – generate a **Key ID** and **Key Secret** in the *Dashboard → Settings → API Keys* section.
2. Node.js ≥ 18.x and npm.

### 2. Environment variables

Copy `.env.example` to `.env` and fill in **all** values:

```bash
cp .env.example .env
nano .env   # or any editor
```

Important keys:

* `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` – from Razorpay dashboard.
* `VITE_API_BASE_URL` – URL where the Express server is reachable (defaults to `http://localhost:4000`).

### 3. Installing dependencies

```bash
npm install
```

This installs the Razorpay SDK and type definitions (`razorpay`, `@types/morgan`, etc.).

### 4. Running locally

Open **two** terminals:

```bash
# Terminal 1 – backend (Express)
npm run server

# Terminal 2 – frontend (Vite)
npm run dev
```

Navigate to `http://localhost:5173` (default Vite port).

### 5. Testing the flow

1. Create some expenses in the UI.
2. Click **Settle Up → Pay with UPI**.
3. Razorpay Checkout opens – use **Test Mode** credentials if your keys are in test mode.
4. After successful payment & server-side signature verification:
   * A toast is shown – *Payment Successful*.
   * All active expenses are marked as **Settled**.

> **Note:** In Razorpay *Test Mode* you can use the `upi` test method (`success@razorpay`) to simulate a successful UPI payment.

### 6. Production deployment

* Expose the Express server over HTTPS (Razorpay Checkout requires HTTPS in production).
* Set `VITE_API_BASE_URL` in the frontend environment to the live backend URL.
* Use your **live** Razorpay keys.
* Configure allowed domains in Razorpay Dashboard → Settings → Webhooks / Allowed Origins if needed.

### 7. Logging & Error handling

* All HTTP requests are logged using **morgan** (`combined` format).
* A global error-handler middleware sends JSON `{ error: 'Internal Server Error' }` for uncaught exceptions while logging the stack.
* Payment routes have granular `try/catch` blocks with helpful console output for easier debugging.

---

Feel free to open an issue or pull request if you encounter any problems! 🌟

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c9e3dcaf-f123-42b2-9105-fd7ccdfcff42) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
