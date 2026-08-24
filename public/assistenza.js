document.getElementById("support-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const form = e.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();

  if (!name || !email || !message) return;

  const subject = encodeURIComponent("Richiesta assistenza Quotify — " + name);
  const body = encodeURIComponent(
    "Nome: " + name + "\nEmail account: " + email + "\n\n" + message
  );

  window.location.href = "mailto:info@alessandroterracciano.com?subject=" + subject + "&body=" + body;

  form.classList.add("hidden");
  document.getElementById("success-msg").classList.remove("hidden");
});
