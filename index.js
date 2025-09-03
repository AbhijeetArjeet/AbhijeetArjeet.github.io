const localUsers = [
  { username: "admin", password: "admin123" },
  { username: "teacher", password: "teach123" },
  { username: "student", password: "stud123" }
];

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("error");
      
  try {
    // 🔹 Try backend login first
    const res = await fetch("https://gameocoder-backend.onrender.com/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      const token = data.token;
      localStorage.setItem("authToken", token);
      alert("Logged in online as " + username);
      window.location.href = "/faculty/index.html";
    } else {
      throw new Error("Invalid credentials (backend)");
    }
  } catch (err) {
    console.warn("Backend unreachable, falling back to offline mode...");

    // 🔹 Offline fallback
    const match = localUsers.find(u => u.username === username && u.password === password);
    if (match) {
      alert("Logged in offline as " + match.username);
      window.location.href = "/faculty/index.html"; 
    } else {
      errorEl.textContent = "Login failed (offline too).";
    }
  }
});
