class PopupManager {
  constructor() {
    this.userEmailInput = document.getElementById("userEmail");
    this.backendUrlInput = document.getElementById("ngrokUrl");
    this.saveButton = document.getElementById("saveSettings");
    this.testButton = document.getElementById("testConnection");
    this.statusMessage = document.getElementById("statusMessage");

    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.validateForm();
  }

async loadSettings() {
  try {
    const settings = await chrome.storage.local.get([
      'userEmail',
      'ngrokUrl'
    ]);

    // The scanner UI no longer contains these settings fields.
    // Keep the saved settings for compatibility with the existing extension.
    this.userEmail = settings.userEmail || '';
    this.ngrokUrl = settings.ngrokUrl || '';

  } catch (error) {
    console.error('ThreatVerdict: Could not load settings:', error);
  }
}
  setupEventListeners() {
    this.saveButton.addEventListener("click", () => {
      this.saveSettings();
    });

    this.testButton.addEventListener("click", () => {
      this.testConnection();
    });

    this.userEmailInput.addEventListener("input", () => {
      this.validateForm();
    });

    this.backendUrlInput.addEventListener("input", () => {
      this.validateForm();
    });
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidUrl(value) {
    try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase();

      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1";

      const isNgrok =
        hostname === "ngrok.io" ||
        hostname.endsWith(".ngrok.io") ||
        hostname === "ngrok-free.app" ||
        hostname.endsWith(".ngrok-free.app");

      return (
        (isLocal &&
          (url.protocol === "http:" ||
            url.protocol === "https:")) ||
        (isNgrok && url.protocol === "https:")
      );
    } catch {
      return false;
    }
  }

  validateForm() {
    const email = this.userEmailInput.value.trim();
    const url = this.backendUrlInput.value.trim();

    this.saveButton.disabled =
      !this.isValidEmail(email) ||
      !this.isValidUrl(url);

    this.testButton.disabled = !this.isValidUrl(url);
  }

  async saveSettings() {
    const email = this.userEmailInput.value.trim();
    const url = this.backendUrlInput.value
      .trim()
      .replace(/\/+$/, "");

    if (!this.isValidEmail(email)) {
      this.showStatus(
        "Please enter a valid email address.",
        "error"
      );
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showStatus(
        "Please enter a valid backend URL.",
        "error"
      );
      return;
    }

    this.saveButton.disabled = true;
    this.saveButton.textContent = "Saving...";

    try {
      await chrome.storage.local.set({
        userEmail: email,
        ngrokUrl: url
      });

      this.showStatus(
        "ThreatLens settings saved successfully!",
        "success"
      );
    } catch (error) {
      this.showStatus(
        "Error saving settings: " + error.message,
        "error"
      );
    } finally {
      this.saveButton.textContent = "Save Settings";
      this.validateForm();
    }
  }

  async testConnection() {
    const url = this.backendUrlInput.value
      .trim()
      .replace(/\/+$/, "");

    if (!this.isValidUrl(url)) {
      this.showStatus(
        "Please enter a valid backend URL first.",
        "error"
      );
      return;
    }

    this.testButton.disabled = true;
    this.testButton.textContent = "Testing...";

    try {
      const response = await fetch(url + "/health");

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      this.showStatus(
        "Backend connection successful!",
        "success"
      );
    } catch (error) {
      this.showStatus(
        "Connection failed. Check that your backend is running, " +
        "the URL and port are correct, and the backend allows requests " +
        "from the extension.",
        "error"
      );
    } finally {
      this.testButton.textContent = "Test Connection";
      this.validateForm();
    }
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = "status-message " + type;
    this.statusMessage.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});