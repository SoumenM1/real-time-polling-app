document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    let pollChart;
    let pollDataReceived = false;

    function initializePollChart(data) {
        const ctx = document.getElementById('poll-chart').getContext('2d');
        pollChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.options,
                datasets: [{
                    label: '# of Votes',
                    data: data.votes,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function updatePollChart(data) {
        pollChart.data.labels = data.options;
        pollChart.data.datasets[0].data = data.votes;
        pollChart.update();
    }

    async function fetchUserData() {
        try {
            const response = await fetch('/api/user');
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching user:', error);
            window.location.href = '/login';
        }
    }

    async function initialize() {
        const user = await fetchUserData();
        const username = user.username;

        // Handle initial poll data
        socket.on('pollData', (data) => {
            pollDataReceived = true;
            setTimeout(() => {
                const pollOptions = document.getElementById('poll-options');
                const pollResults = document.getElementById('poll-results');
                
                pollOptions.innerHTML = '';
                pollResults.innerHTML = '';
                
                data.options.forEach((option, index) => {
                    const button = document.createElement('button');
                    button.textContent = option;
                    button.onclick = () => {
                        socket.emit('vote', index);
                    };
                    pollOptions.appendChild(button);
                });

                data.votes.forEach((vote, index) => {
                    const result = document.createElement('div');
                    result.textContent = `${data.options[index]}: ${vote} votes`;
                    pollResults.appendChild(result);
                });

                if (!pollChart) {
                    initializePollChart(data);
                } else {
                    updatePollChart(data);
                }
            }, 1000);
        });

        // Handle chat messages
        socket.on('chatMessages', (messages) => {
            const chatMessagesDiv = document.getElementById('chat-messages');
            chatMessagesDiv.innerHTML = '';

            messages.forEach(({username, message}) => {
                const messageDiv = document.createElement('div');
                messageDiv.textContent = `${username}: ${message}`;
                chatMessagesDiv.appendChild(messageDiv);
            });
        });

        // Send chat message
        document.getElementById('send-button').onclick = () => {
            const chatInput = document.getElementById('chat-input');
            const message = chatInput.value;
            socket.emit('chatMessage', { username, message });
            chatInput.value = '';
        };

        // Typing indicator
        document.getElementById('chat-input').oninput = () => {
            socket.emit('typing', username);
        };

        socket.on('typing', (username) => {
            const typingIndicator = document.getElementById('typing-indicator');
            typingIndicator.textContent = `${username} is typing...`;
            setTimeout(() => {
                typingIndicator.textContent = '';
            }, 1000);
        });
    }

    socket.on('connect', async() => {
        console.log('Connected to server');
         await initialize();

        // Request initial poll data on connection
        if (!pollDataReceived) {
            socket.emit('requestPollData');
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
});
