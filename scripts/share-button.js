class ShareButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const shareData = {
      title: document.querySelector('h2').innerText,
      text: document.querySelector('h3').innerText,
      url: window.location.href
    };

    if (navigator.canShare && navigator.canShare(shareData)) {
      const shareBtn = document.createElement('button');
      shareBtn.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="24"
      viewBox="0 0 332.904 332.904" xml:space="preserve">
      <path fill="currentColor" d="M248.001,220.774c-17.483,0-33.116,8.055-43.403,20.639l-75.761-44.232
		c7.572-9.559,12.131-21.606,12.131-34.715c0-12.154-3.926-23.378-10.526-32.573l72.265-40.945
		c10.197,14.01,26.678,23.169,45.295,23.169c30.908,0,56.059-25.144,56.059-56.059S278.909,0,248.001,0
		s-56.059,25.144-56.059,56.059c0,8.025,1.724,15.651,4.779,22.561l-74.449,42.186c-9.929-8.915-23.002-14.392-37.371-14.392
		c-30.908,0-56.059,25.144-56.059,56.059c0,30.908,25.144,56.059,56.059,56.059c13.372,0,25.646-4.72,35.294-12.56l77.892,45.474
		c-3.896,7.632-6.146,16.254-6.146,25.401c0,30.908,25.15,56.059,56.059,56.059s56.059-25.15,56.059-56.059
		S278.909,220.774,248.001,220.774z"/>
      </svg>`;
      shareBtn.addEventListener('click', () => {
        navigator.share(shareData);
      });
    
      this.innerHTML = '';
      this.appendChild(shareBtn);
    } else {
      document.querySelector('#copy-link').addEventListener('click', () => {
        navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        alert('Copied link in clipboard');
      });
    }
  }
}

customElements.define('share-button', ShareButton);