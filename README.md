# 🐾 VitalPet: The Science-Based Cyber Pet

![VitalPet Banner](assets/cat_idle.png) > **The cyber pet that truly understands exercise physiology.**
> Governed by real human metabolism and circadian rhythms. Every physical step you take is the sole fuel for its evolution.

## ✨ Features

- **🚶‍♂️ Real-World Step Sync:** Integrates with iOS Apple Health via a custom Shortcut. Your real-world steps convert directly into food (`Fish`) for your pet.
- **🧬 Biological Metabolism System:** The pet features a realistic hunger drain mechanism. It gets hungry over time, penalizing prolonged sedentary behavior.
- **📈 Tamagotchi-style Progression:** Feed your pet to restore its hunger bar and gain EXP. Accumulate EXP to level up and unlock new states.
- **👤 Multi-User & Guest Mode:** Instantly jump in with a "Guest" account pre-loaded with 10 food rations, or log in with your specific username to maintain isolated progression data.
- **📸 Export to Poster:** Built-in engine to generate and download a sleek 3:4 cyber-style poster of your pet's current state.

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- `html2canvas` (for poster generation)
- Fully responsive design prioritizing mobile UI.

**Backend:**
- Python 3.x
- Flask (Lightweight RESTful API)
- SQLite (Local database with auto-initialization)

## 🚀 Quick Start (Local Development)

Follow these steps to get the project running on your local machine.

### 1. Clone the repository
```bash
git clone [https://github.com/emmismyname/Vispet.git](https://github.com/emmismyname/Vispet)
cd vitalpet
2. Set up the Environment
It is recommended to use a virtual environment.

Bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
3. Install Dependencies
Bash
pip install -r requirements.txt
4. Run the Server
Bash
cd backend
python app.py
The app will automatically create a vitalpet.db SQLite database if it doesn't exist. Visit http://127.0.0.1:5000 in your browser to interact with your pet!

📱 Apple Health Binding (iOS)
To feed your pet using your real steps, you must bind your iPhone's Apple Health data:

Open the VitalPet web app on your device.

Navigate to "Bind Phone" via the main screen.

Scan the generated QR code or click the link to install the VitalPet Health Sync iOS Shortcut.

Allow the Shortcut permission to read your Steps data from the Health app.

Tap the shortcut to push your daily steps to the backend server and convert them into pet food!

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.