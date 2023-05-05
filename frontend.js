const form = document.querySelector('form');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  e.stopPropagation();

  const formData = new FormData(form);

  const titlee = formData.get('title');
  const completed = formData.get('completed') === 'on';

  fetch('http://127.0.0.1:8787/todos/1234', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ titlee, completed }),
  });
});
