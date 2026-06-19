document.addEventListener('DOMContentLoaded', () => {

  // --- BACKEND API CONFIG & HELPERS ---
  let cachedDashboardTickets = [];

  function getAuthHeader() {
    const token = localStorage.getItem('sakthi_admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // --- HEADER & SCROLL ANIMATION ---
  const header = document.querySelector('.header-wrapper');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section');

  window.addEventListener('scroll', () => {
    // Navbar scroll reduction
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Scroll spy: Active link indicator
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.pageYOffset >= (sectionTop - 120)) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').slice(1) === current) {
        link.classList.add('active');
      }
    });

    // Timeline connector line progression
    const timeline = document.querySelector('.timeline-container');
    if (timeline) {
      const progressLine = document.querySelector('.timeline-progress');
      const timelineItems = document.querySelectorAll('.timeline-item');
      
      const timelineRect = timeline.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      if (timelineRect.top < viewportHeight && timelineRect.bottom > 0) {
        const scrolledRatio = Math.max(0, Math.min(1, (viewportHeight - timelineRect.top) / (timelineRect.height + viewportHeight - 300)));
        progressLine.style.height = `${scrolledRatio * 100}%`;
        
        timelineItems.forEach(item => {
          const itemRect = item.getBoundingClientRect();
          if (itemRect.top < viewportHeight - 150) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      }
    }
  });

  // --- MOBILE NAV TOGGLE ---
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');

  mobileToggle.addEventListener('click', () => {
    mobileToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close mobile menu on clicking links
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileToggle.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  // --- REVIEWS CAROUSEL ---
  const track = document.querySelector('.reviews-carousel-track');
  const slides = Array.from(track?.children || []);
  const nextBtn = document.querySelector('.carousel-btn-next');
  const prevBtn = document.querySelector('.carousel-btn-prev');
  const dotsContainer = document.querySelector('.carousel-dots');
  let currentSlideIndex = 0;
  let autoPlayTimer;

  if (slides.length > 0) {
    // Generate navigation dots dynamically
    slides.forEach((_, index) => {
      const dot = document.createElement('div');
      dot.classList.add('carousel-dot');
      if (index === 0) dot.classList.add('active');
      dot.addEventListener('click', () => {
        moveToSlide(index);
        resetAutoPlay();
      });
      dotsContainer.appendChild(dot);
    });

    const dots = Array.from(dotsContainer.children);

    function moveToSlide(index) {
      track.style.transform = `translateX(-${index * 100}%)`;
      dots[currentSlideIndex].classList.remove('active');
      dots[index].classList.add('active');
      currentSlideIndex = index;
    }

    function showNextSlide() {
      const nextIndex = (currentSlideIndex + 1) % slides.length;
      moveToSlide(nextIndex);
    }

    function showPrevSlide() {
      const prevIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
      moveToSlide(prevIndex);
    }

    nextBtn.addEventListener('click', () => {
      showNextSlide();
      resetAutoPlay();
    });

    prevBtn.addEventListener('click', () => {
      showPrevSlide();
      resetAutoPlay();
    });

    // Autoplay Timer
    function startAutoPlay() {
      autoPlayTimer = setInterval(showNextSlide, 5000);
    }

    function resetAutoPlay() {
      clearInterval(autoPlayTimer);
      startAutoPlay();
    }

    startAutoPlay();
  }



  // --- PRE-BOOKING FORM PROCESSING ---
  const bookingForm = document.getElementById('bookingForm');
  const bookingInputs = bookingForm.querySelectorAll('.form-input');
  const bookingSuccessBox = document.getElementById('bookingSuccess');
  const ticketIdDisplay = document.getElementById('ticketIdDisplay');
  const newBookingBtn = document.getElementById('newBookingBtn');

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let hasError = false;

    // Field-level validations
    bookingInputs.forEach(input => {
      const fieldGroup = input.parentElement;
      const errorMsg = fieldGroup.querySelector('.form-error-msg');
      if (errorMsg) errorMsg.remove();
      input.classList.remove('error');

      if (!input.value.trim()) {
        hasError = true;
        input.classList.add('error');
        addErrorMsg(fieldGroup, 'This field is required');
      } else if (input.id === 'phone' && !/^\d{10}$/.test(input.value.trim())) {
        hasError = true;
        input.classList.add('error');
        addErrorMsg(fieldGroup, 'Please enter a valid 10-digit mobile number');
      }
    });

    if (!hasError) {
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      const bookingPayload = {
        name: document.getElementById('fullName').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        brand: document.getElementById('deviceBrand').value,
        deviceType: document.getElementById('deviceType').value,
        problem: document.getElementById('problemDesc').value.trim(),
        date: document.getElementById('bookingDate').value
      };

      fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to create booking on the server.');
        return res.json();
      })
      .then(data => {
        const newTicket = data.ticket;

        // Update success states
        ticketIdDisplay.textContent = newTicket.ticketId;
        bookingForm.style.display = 'none';
        bookingSuccessBox.style.display = 'flex';

        // Configure WhatsApp Share Button
        const trackUrl = `${window.location.origin}/#booking-tracking`;
        const whatsappMsg = `Hi ${newTicket.name}, your repair appointment at Sakthi Systems & Services has been booked successfully! Ticket ID: ${newTicket.ticketId}. Track progress here: ${trackUrl}`;
        const successWhatsAppBtn = document.getElementById('successWhatsAppBtn');
        if (successWhatsAppBtn) {
          successWhatsAppBtn.href = `https://wa.me/91${newTicket.phone}?text=${encodeURIComponent(whatsappMsg)}`;
        }

        // Trigger Simulated Notification Sequence: SMS, WhatsApp, then Owner Alert
        showNotificationToast('sms', newTicket.name, newTicket.phone, newTicket.ticketId);
        setTimeout(() => {
          showNotificationToast('whatsapp', newTicket.name, newTicket.phone, newTicket.ticketId);
        }, 5000);
        setTimeout(() => {
          showNotificationToast('owner', newTicket.name, newTicket.phone, newTicket.ticketId);
        }, 10000);

        // Reset inputs
        bookingForm.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Book Appointment';

        // Refresh Dashboard if open
        if (document.getElementById('employee-dashboard').classList.contains('active')) {
          renderDashboardTickets();
        }
      })
      .catch(err => {
        alert(err.message || 'Error creating booking. Please check connection and try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Book Appointment';
      });
    }
  });

  function addErrorMsg(container, message) {
    const errorSpan = document.createElement('span');
    errorSpan.classList.add('form-error-msg');
    errorSpan.textContent = message;
    container.appendChild(errorSpan);
  }

  newBookingBtn.addEventListener('click', () => {
    bookingSuccessBox.style.display = 'none';
    bookingForm.style.display = 'block';
  });


  // --- REPAIR TRACKING ENGINE ---
  const trackForm = document.getElementById('trackForm');
  const trackIdInput = document.getElementById('trackTicketId');
  const trackPhoneInput = document.getElementById('trackPhone');
  const trackingDisplay = document.getElementById('trackingDisplay');
  const trackingEmpty = document.getElementById('trackingEmpty');

  const statusSteps = {
    'Received': 1,
    'Diagnosis': 2,
    'Waiting': 3,
    'Repairing': 4,
    'Testing': 5,
    'Ready': 6
  };

  trackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const queryId = trackIdInput.value.trim().toUpperCase();
    const queryPhone = trackPhoneInput.value.trim();

    fetch(`/api/tickets/track?ticketId=${encodeURIComponent(queryId)}&phone=${encodeURIComponent(queryPhone)}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('No matching repair ticket found. Please check Ticket ID and Mobile Number.');
        }
        return res.json();
      })
      .then(ticket => {
        renderTrackingDetails(ticket);
      })
      .catch(err => {
        alert(err.message);
        trackingDisplay.classList.remove('active');
        trackingEmpty.style.display = 'flex';
      });
  });

  function renderTrackingDetails(ticket) {
    trackingEmpty.style.display = 'none';
    trackingDisplay.classList.add('active');

    // Display fields
    document.getElementById('displayTicketId').textContent = ticket.ticketId;
    document.getElementById('displayBrandDevice').textContent = `${ticket.brand} ${ticket.deviceType}`;
    document.getElementById('displayNotes').textContent = ticket.notes || 'No notes available.';
    
    // Status text mapping
    const statusLabels = {
      'Received': 'Device Received',
      'Diagnosis': 'Diagnosis In Progress',
      'Waiting': 'Waiting for Approval',
      'Repairing': 'Repair In Progress',
      'Testing': 'Testing & QC',
      'Ready': 'Ready for Collection'
    };
    document.getElementById('displayStatus').textContent = statusLabels[ticket.status] || ticket.status;

    // Stepper updates
    const currentStepNum = statusSteps[ticket.status] || 1;
    const stepperNodes = document.querySelectorAll('#trackingDisplay .status-step');
    const stepperProgressLine = document.querySelector('#trackingDisplay .status-flow-progress');

    // Stepper progress calculation
    const progressPercent = ((currentStepNum - 1) / (Object.keys(statusSteps).length - 1)) * 100;
    stepperProgressLine.style.height = `${progressPercent}%`;

    stepperNodes.forEach(node => {
      const stepName = node.getAttribute('data-step');
      const stepNum = statusSteps[stepName];

      node.classList.remove('completed', 'active');

      if (stepNum < currentStepNum) {
        node.classList.add('completed');
      } else if (stepNum === currentStepNum) {
        node.classList.add('active');
      }
    });

    // Scroll to tracking display smoothly
    trackingDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }


  // --- SERVICES TABS CONTROLLER ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const serviceGrids = document.querySelectorAll('.services-grid');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetGridId = btn.getAttribute('data-tab');
      serviceGrids.forEach(grid => {
        grid.classList.remove('active');
        if (grid.id === targetGridId) {
          grid.classList.add('active');
        }
      });
    });
  });


  // --- WHATSAPP WIDGET CONTROL ---
  const waTrigger = document.getElementById('whatsapp-trigger');
  const waChat = document.getElementById('whatsapp-chat');
  const waNotifyDot = document.getElementById('whatsapp-notify-dot');
  const waSend = document.getElementById('whatsapp-send');
  const waInput = document.getElementById('whatsapp-input');
  const waChatBody = document.getElementById('whatsapp-chat-body');

  waTrigger.addEventListener('click', () => {
    waChat.classList.toggle('active');
    if (waNotifyDot) waNotifyDot.remove(); // Clear notification on click
  });

  // Send simulation
  waSend.addEventListener('click', submitWAMessage);
  waInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitWAMessage();
  });

  function submitWAMessage() {
    const text = waInput.value.trim();
    if (text) {
      // Append user bubble
      const userMsg = document.createElement('div');
      userMsg.classList.add('whatsapp-msg');
      userMsg.style.alignSelf = 'flex-end';
      userMsg.style.borderRadius = '8px 0 8px 8px';
      userMsg.style.background = '#DCF8C6';
      userMsg.innerHTML = `${text}<span class="whatsapp-msg-time">${getCurrentTime()}</span>`;
      waChatBody.appendChild(userMsg);

      waInput.value = '';
      waChatBody.scrollTop = waChatBody.scrollHeight;

      // Redirect user message directly to WhatsApp API
      const whatsappUrl = `https://wa.me/917373565282?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');

      // Simulate reply delay
      setTimeout(() => {
        const supportMsg = document.createElement('div');
        supportMsg.classList.add('whatsapp-msg');
        supportMsg.innerHTML = `Redirecting you to WhatsApp to send your message to our technician. Thank you!<span class="whatsapp-msg-time">${getCurrentTime()}</span>`;
        waChatBody.appendChild(supportMsg);
        waChatBody.scrollTop = waChatBody.scrollHeight;
      }, 1000);
    }
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }


  // --- EMPLOYEE LOGIN AND DASHBOARD ENGINE ---
  const loginBtn = document.getElementById('employeeLoginLink');
  const loginModal = document.getElementById('loginModal');
  const loginClose = document.getElementById('loginClose');
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const dashboardSection = document.getElementById('employee-dashboard');

  let activeDashboardTicketId = null;

  // Function to open login modal strictly when URL hash is #admin
  function checkUrlForLogin() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#admin') {
      const token = localStorage.getItem('sakthi_admin_token');
      if (token) {
        dashboardSection.classList.add('active');
        dashboardSection.scrollIntoView({ behavior: 'smooth' });
        renderDashboardTickets();
      } else {
        loginModal.classList.add('active');
      }
    }
  }

  // Initial check on page load
  checkUrlForLogin();

  // Check on hashchange
  window.addEventListener('hashchange', checkUrlForLogin);

  // Close Modal
  loginClose.addEventListener('click', () => {
    loginModal.classList.remove('active');
    const hash = window.location.hash.toLowerCase();
    if (hash === '#admin') {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  });

  // Modal backdrop click
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
      loginModal.classList.remove('active');
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
      }
    }
  });

  // Form Submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(async res => {
      if (!res.ok) {
        let errMsg = 'Invalid Username or Password.';
        try {
          const errData = await res.json();
          if (errData && errData.message) errMsg = errData.message;
        } catch (e) {}
        throw new Error(errMsg);
      }
      return res.json();
    })
    .then(data => {
      if (data.success && data.token) {
        localStorage.setItem('sakthi_admin_token', data.token);
        loginForm.reset();
        loginModal.classList.remove('active');
        
        // Open dashboard
        dashboardSection.classList.add('active');
        dashboardSection.scrollIntoView({ behavior: 'smooth' });
        
        // Load details
        renderDashboardTickets();
      }
    })
    .catch(err => {
      alert(err.message);
    });
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('sakthi_admin_token');
    dashboardSection.classList.remove('active');
    activeDashboardTicketId = null;
    document.getElementById('db-detail-panel').classList.remove('active');
    document.getElementById('db-detail-empty').style.display = 'flex';
    // Clear admin hash
    history.pushState("", document.title, window.location.pathname + window.location.search);
  });

  // Render tickets list in dashboard
  function renderDashboardTickets() {
    const listWrapper = document.getElementById('ticketsList');
    listWrapper.innerHTML = '<p style="color:#64748B; text-align:center; padding: 2rem;">Loading tickets...</p>';
    
    fetch('/api/admin/tickets', {
      headers: getAuthHeader()
    })
    .then(res => {
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('sakthi_admin_token');
          dashboardSection.classList.remove('active');
          alert('Session expired. Please log in again.');
        }
        throw new Error('Failed to load dashboard tickets');
      }
      return res.json();
    })
    .then(tickets => {
      cachedDashboardTickets = tickets;
      listWrapper.innerHTML = '';
      if (tickets.length === 0) {
        listWrapper.innerHTML = '<p style="color:#64748B; text-align:center; padding: 2rem;">No active repair tickets found.</p>';
        return;
      }

      // Sort tickets reverse-chronologically
      const reversedTickets = [...tickets].reverse();

      reversedTickets.forEach(ticket => {
        const row = document.createElement('div');
        row.className = `ticket-row ${activeDashboardTicketId === ticket.ticketId ? 'active' : ''}`;
        row.setAttribute('data-id', ticket.ticketId);

        const statusLabels = {
          'Received': 'Received',
          'Diagnosis': 'Diagnosis',
          'Waiting': 'Waiting',
          'Repairing': 'Repairing',
          'Testing': 'Testing',
          'Ready': 'Ready'
        };

        const badgeClass = `badge-status-${ticket.status.toLowerCase()}`;

        row.innerHTML = `
          <div class="ticket-row-main">
            <h4>${ticket.ticketId} - ${ticket.name}</h4>
            <p>${ticket.brand} ${ticket.deviceType} | Ph: ${ticket.phone}</p>
          </div>
          <div class="ticket-row-meta">
            <span class="ticket-row-badge ${badgeClass}">${statusLabels[ticket.status] || ticket.status}</span>
            <span class="ticket-row-date">${ticket.date}</span>
          </div>
        `;

        row.addEventListener('click', () => {
          document.querySelectorAll('.ticket-row').forEach(r => r.classList.remove('active'));
          row.classList.add('active');
          loadTicketDetails(ticket.ticketId);
        });

        listWrapper.appendChild(row);
      });
    })
    .catch(err => {
      listWrapper.innerHTML = `<p style="color:#EF4444; text-align:center; padding: 2rem;">${err.message}</p>`;
    });
  }

  // Load ticket details on right panel
  function loadTicketDetails(ticketId) {
    activeDashboardTicketId = ticketId;
    const ticket = cachedDashboardTickets.find(t => t.ticketId === ticketId);

    if (ticket) {
      document.getElementById('db-detail-empty').style.display = 'none';
      const detailContent = document.getElementById('db-detail-panel');
      detailContent.classList.add('active');

      // Update static display fields
      document.getElementById('dbTicketId').textContent = ticket.ticketId;
      document.getElementById('dbCustomerName').textContent = ticket.name;
      document.getElementById('dbCustomerPhone').textContent = ticket.phone;
      document.getElementById('dbDeviceName').textContent = `${ticket.brand} ${ticket.deviceType}`;
      document.getElementById('dbProblemDesc').textContent = ticket.problem;
      document.getElementById('dbCreatedDate').textContent = ticket.date;

      // Set input states
      document.getElementById('dbStatusSelect').value = ticket.status;
      document.getElementById('dbNotesText').value = ticket.notes || '';
    }
  }

  // Update Ticket Status from Dashboard
  const updateTicketForm = document.getElementById('dbUpdateTicketForm');
  updateTicketForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeDashboardTicketId) return;

    const newStatus = document.getElementById('dbStatusSelect').value;
    const newNotes = document.getElementById('dbNotesText').value.trim();

    const submitBtn = updateTicketForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    fetch(`/api/admin/tickets/${encodeURIComponent(activeDashboardTicketId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ status: newStatus, notes: newNotes })
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to update ticket status on server.');
      return res.json();
    })
    .then(data => {
      alert("Status updated");
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Status';

      // Refresh displays
      renderDashboardTickets();
      loadTicketDetails(activeDashboardTicketId);

      // If the customer search display is active and tracking this ticket, update it!
      const currentSearchedTicketId = document.getElementById('displayTicketId').textContent;
      if (currentSearchedTicketId === activeDashboardTicketId) {
        renderTrackingDetails(data.ticket);
      }
    })
    .catch(err => {
      alert(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Status';
    });
  });

  // --- NOTIFICATION SIMULATOR TOAST FUNCTION ---
  function showNotificationToast(type, name, phone, ticketId) {
    let toast = document.getElementById('simulated-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'simulated-notification';
      toast.className = 'simulated-notification-toast';
      document.body.appendChild(toast);
    }

    let appName = 'Messages (SMS)';
    let appIcon = '✉️';
    let themeColor = '#3b82f6';
    let msgText = '';
    let sender = 'Sakthi Systems';

    if (type === 'whatsapp') {
      appName = 'WhatsApp';
      appIcon = '<svg style="width: 14px; height: 14px; fill: #25D366; vertical-align: middle; margin-right: 4px;" viewBox="0 0 24 24"><path d="M12.031 0C5.392 0 .02 5.373.02 12.012c0 2.123.553 4.195 1.605 6.015L.03 24l6.136-1.613a11.956 11.956 0 0 0 5.865 1.53c6.638 0 12.01-5.372 12.01-12.012C24.041 5.373 18.669 0 12.031 0zm6.818 17.202c-.274.773-1.6 1.411-2.222 1.5-1.12.16-2.585.347-6.28-1.185-4.723-1.957-7.77-6.76-8.006-7.076-.236-.316-1.89-2.514-1.89-4.802 0-2.288 1.182-3.414 1.603-3.874.42-.46 1.123-.578 1.603-.578h1.018c.325 0 .61.042.845.6.31 1.096.88 2.666 1.026 2.96.145.294.135.534-.055.824-.19.29-.286.42-.477.639-.19.22-.38.44-.572.68-.21.264-.43.554-.183.978.247.424 1.1 1.812 2.36 2.936 1.615 1.442 2.973 1.888 3.395 2.1-.422.21-.926.176-1.242.062.247-.424.64-.81.786-.973.146-.164.29-.185.54-.062.25.124 1.054.388 2.008 1.238.742.662 1.243 1.48 1.388 1.728.145.248.015.383-.11.507-.112.11-.25.291-.375.434-.124.145-.165.248-.25.414-.083.165-.042-.31-.02-.434-.063-.124-.559-1.346-.766-1.844-.202-.487-.406-.42-.559-.428H8.7c-.166 0-.435.062-.663.31-.228.248-.87.85-.87 2.07s.89 2.4 1.014 2.564c.124.165 1.752 2.675 4.244 3.75 1.036.447 1.838.71 2.477.913.627.2 1.198.172 1.649.105.503-.075 1.477-.603 1.684-1.159.207-.556.207-1.033.145-1.134-.062-.1-.228-.165-.477-.289z"/></svg>';
      themeColor = '#25D366';
      msgText = `Hi ${name}, your repair appointment at Sakthi Systems is confirmed! We will update you when diagnosis begins. 🛠️`;
    } else if (type === 'owner') {
      appName = 'Owner Alert';
      appIcon = '📢';
      themeColor = '#f59e0b';
      sender = 'To Owner (7373565282)';
      msgText = `Service booked with the customer ${name} and mobile ${phone}`;
    } else {
      msgText = `Hi ${name}, booking for ${ticketId} is successful. We sent a WhatsApp verification to ${phone}. Thank you!`;
    }

    toast.style.borderLeftColor = themeColor;
    
    // Hide previous if active
    toast.classList.remove('show');
    
    setTimeout(() => {
      toast.innerHTML = `
        <div class="simulated-notification-header">
          <div class="simulated-notification-app">
            <span class="simulated-notification-icon">${appIcon}</span>
            <span class="simulated-notification-app-name" style="color: ${themeColor}">${appName}</span>
          </div>
          <span class="simulated-notification-time">now</span>
        </div>
        <div class="simulated-notification-body">
          <strong class="simulated-notification-sender">Sakthi Systems</strong>
          <p class="simulated-notification-text">${msgText}</p>
        </div>
      `;
      toast.classList.add('show');
    }, 300);

    // Auto-remove show class
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  // --- INTERSECTION OBSERVER FOR SCROLL REVEAL ---
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  
  if ('IntersectionObserver' in window && revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target); // Trigger once
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback if IntersectionObserver is unsupported
    revealElements.forEach(el => el.classList.add('active'));
  }

});
