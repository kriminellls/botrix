(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     Hero: kendi kendine oynayan örnek konuşma (tek, kurgulanmış an)
  --------------------------------------------------------------------- */

  var heroScript = [
    { side: "in", text: "Merhaba, yarın için boş yeriniz var mı?" },
    { side: "out", text: "Merhaba! Yarın için uygun saatler: 11:00 ve 15:30. Hangisi size uyar?" },
    { side: "in", text: "15:30 uygun" },
    { side: "out", text: "Randevunuz alındı ✅ Yarın 15:30'da görüşmek üzere!" },
  ];

  function playHeroScript() {
    var chat = document.getElementById("heroChat");
    var badge = document.getElementById("heroBadge");
    if (!chat) return;

    chat.innerHTML = "";
    badge && badge.classList.remove("is-visible");

    if (prefersReducedMotion) {
      heroScript.forEach(function (line) {
        chat.appendChild(makeBubble(line.side, line.text));
      });
      badge && badge.classList.add("is-visible");
      return;
    }

    var i = 0;

    function step() {
      if (i >= heroScript.length) {
        badge && badge.classList.add("is-visible");
        setTimeout(playHeroScript, 4200);
        return;
      }
      var line = heroScript[i];

      if (line.side === "out") {
        var typing = document.createElement("div");
        typing.className = "bubble bubble--typing";
        typing.innerHTML = "<span></span><span></span><span></span>";
        chat.appendChild(typing);
        chat.scrollTop = chat.scrollHeight;

        setTimeout(function () {
          typing.remove();
          chat.appendChild(makeBubble(line.side, line.text));
          chat.scrollTop = chat.scrollHeight;
          i++;
          setTimeout(step, 900);
        }, 900);
      } else {
        chat.appendChild(makeBubble(line.side, line.text));
        chat.scrollTop = chat.scrollHeight;
        i++;
        setTimeout(step, 1000);
      }
    }

    step();
  }

  function makeBubble(side, text) {
    var el = document.createElement("div");
    el.className = "bubble bubble--" + side;
    el.textContent = text;
    return el;
  }

  playHeroScript();

  /* ---------------------------------------------------------------------
     Canlı demo: ziyaretçi yazar, /api/reply cevap üretir
  --------------------------------------------------------------------- */

  var demoForm = document.getElementById("demoForm");
  var demoInput = document.getElementById("demoInput");
  var demoChat = document.getElementById("demoChat");

  function appendDemoBubble(side, text) {
    var el = makeBubble(side, text);
    demoChat.appendChild(el);
    demoChat.scrollTop = demoChat.scrollHeight;
    return el;
  }

  function sendDemoMessage(message) {
    if (!message || !message.trim()) return;
    appendDemoBubble("out", message);

    var typing = document.createElement("div");
    typing.className = "bubble bubble--typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    demoChat.appendChild(typing);
    demoChat.scrollTop = demoChat.scrollHeight;

    fetch("/api/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        typing.remove();
        appendDemoBubble("in", data.reply || "Şu an cevap veremedim, tekrar dener misin?");
      })
      .catch(function () {
        typing.remove();
        appendDemoBubble("in", "Bağlantıda küçük bir sorun oldu, tekrar dener misin?");
      });
  }

  if (demoForm) {
    demoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = demoInput.value;
      demoInput.value = "";
      sendDemoMessage(value);
    });
  }

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      sendDemoMessage(chip.getAttribute("data-msg"));
    });
  });

  /* ---------------------------------------------------------------------
     ROI hesaplayıcı
  --------------------------------------------------------------------- */

  var messagesInput = document.getElementById("calcMessages");
  var missRateInput = document.getElementById("calcMissRate");
  var valueInput = document.getElementById("calcValue");

  var messagesOut = document.getElementById("calcMessagesOut");
  var missRateOut = document.getElementById("calcMissRateOut");
  var valueOut = document.getElementById("calcValueOut");

  var lostAppointmentsEl = document.getElementById("calcLostAppointments");
  var lostRevenueEl = document.getElementById("calcLostRevenue");

  // Kaçan mesajların kabaca ne kadarının randevuya dönüşebileceğine dair
  // temkinli bir varsayım. Sabit ve açıkça tahmini.
  var CONVERSION_ASSUMPTION = 0.4;
  var DAYS_PER_MONTH = 30;

  function formatNumber(n) {
    return Math.round(n).toLocaleString("tr-TR");
  }

  function updateCalculator() {
    var messages = Number(messagesInput.value);
    var missRate = Number(missRateInput.value) / 100;
    var value = Number(valueInput.value);

    messagesOut.textContent = messages;
    missRateOut.textContent = "%" + Math.round(missRate * 100);
    valueOut.textContent = formatNumber(value) + "₺";

    var lostMessagesPerMonth = messages * missRate * DAYS_PER_MONTH;
    var lostAppointments = lostMessagesPerMonth * CONVERSION_ASSUMPTION;
    var lostRevenue = lostAppointments * value;

    lostAppointmentsEl.textContent = formatNumber(lostAppointments);
    lostRevenueEl.textContent = formatNumber(lostRevenue);
  }

  [messagesInput, missRateInput, valueInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener("input", updateCalculator);
  });

  if (messagesInput) updateCalculator();
})();
