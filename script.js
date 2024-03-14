var Logouticon = document.getElementById("img");
        Logouticon.addEventListener('mouseover', function () {

        })
        // Set the initial width of the sidebar to 13.5%
        document.getElementById("mainContainer").style.marginLeft = "13.5%";
        document.getElementById("sidebar").style.width = "13.5%";
        document.getElementById("sticky-top").style.marginLeft = "13.5%";

        function loginslideopen() {
            document.getElementById("page").style.width = "50%";
        }

        function loginslideclose() {
            document.getElementById("page").style.width = "0";
        }

        function loginslideopenRight() {
            document.getElementById("page1").style.width = "50%";
        }

        function loginslidecloseRight() {
            document.getElementById("page1").style.width = "0";
        }


        // Function to display welcome message if the user is logged in
        function displayWelcomeIfLoggedIn() {
            // Check if the user is logged in
            var loggedInUser = localStorage.getItem('loggedInUser');
            if (loggedInUser) {
                var chatBox = document.getElementById('chatBox');

                // Simulate AI typing before showing the welcome message
                simulateTyping();

                // Display the welcome message with typing animation
                displayWithTyping('bot', 'Welcome back, ' + loggedInUser + '! How can I assist you today?');

                // Stop simulating typing after showing the welcome message
                stopTyping();

                // Scroll to the bottom to show the latest message
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        }

        // Call this function to display the welcome message if the user is logged in
        displayWelcomeIfLoggedIn();

        function displayWelcomeMessage2() {
            var chatBox = document.getElementById('chatBox');

            // Simulate AI typing before showing the welcome message
            simulateTyping();

            // Display the welcome message with typing animation
            displayWithTyping('bot', 'Logged in 🔗 Welcome sir, how can I help you?');

            // Stop simulating typing after showing the welcome message
            stopTyping();

            // Scroll to the bottom to show the latest message
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function Newchatcreated() {
            var chatBox = document.getElementById('chatBox');

            // Simulate AI typing before showing the welcome message
            simulateTyping();

            // Display the welcome message with typing animation
            displayWithTyping('bot', 'You created Newchat , how can I help you?');

            // Stop simulating typing after showing the welcome message
            stopTyping();

            // Scroll to the bottom to show the latest message
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function showhowcan() {
            document.getElementById("howcan").style.opacity = "1";
        }

        function hidehowcan() {
            document.getElementById("howcan").style.opacity = "0";
        }

        // Add an event listener for the DOMContentLoaded event
        document.addEventListener('DOMContentLoaded', function () {
            // Call hidehowcan() after the page is loaded
            hidehowcan();

        });

        // Get the user input field and the send button
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');

        // Add event listener to the user input field
        userInput.addEventListener('input', function () {
            // Check if the user input is empty
            if (userInput.value.trim() === '') {
                // If input is empty, set the background color of send button to gray
                sendButton.style.backgroundColor = 'gray';
            } else {
                // If input is not empty, set the background color of send button to black
                sendButton.style.backgroundColor = 'black';
            }
        });

        // Initialize newChatCounter from localStorage or set it to 1
        var newChatCounter = parseInt(localStorage.getItem('newChatCounter')) || 1;
        // Restore chatData from localStorage or set it to an empty array
        var chatData = JSON.parse(localStorage.getItem('chatData')) || [];

        // ...

        function handleNewChatClick() {
            // Remove the 'active' class and background color from the previously active "New Chat" text
            var activeNewChat = document.querySelector('.new-chat-text.active');
            if (activeNewChat) {
                activeNewChat.classList.remove('active');
                activeNewChat.style.backgroundColor = ''; // Reset background color
                activeNewChat.style.border = "";
            }

            // Create an object to store chat details
            var chatDetails = {
                name: 'New Chat ' + newChatCounter,
                counter: newChatCounter
            };

            if (newChatCounter <= 10) {
                // Add "New Chat" text above sidebar item 2
                var newChatText = document.createElement('div');
                newChatText.classList.add('days', 'new-chat-text', 'active');
                newChatText.innerHTML = chatDetails.name;
                newChatCounter++;

                // Create delete icon
                var deleteIcon = document.createElement('img');
                deleteIcon.src = 'https://cdn-icons-png.flaticon.com/128/9321/9321240.png';
                deleteIcon.classList.add('delete-icon');
                deleteIcon.style.display = 'none'; // Initially hide the delete icon
                deleteIcon.addEventListener('click', function () {
                    deleteChat(chatDetails, newChatText);
                    newChatText.style.backgroundColor = '#ccc';
                });


                // Append the new element and delete icon to the sidebar
                newChatText.appendChild(deleteIcon);
                document.querySelector('.sidebar').insertBefore(newChatText, document.querySelector('.text'));

                // Apply styling to the recently created "New Chat" text
                newChatText.style.backgroundColor = '#ccc';
                newChatText.style.border = "1px solid #bbb"
                document.getElementById("currentchat").style.backgroundColor = "whitesmoke"

                // Store the chat details in the array
                chatData.push(chatDetails);

                // Store newChatCounter and chatData in localStorage
                localStorage.setItem('newChatCounter', newChatCounter);
                localStorage.setItem('chatData', JSON.stringify(chatData));

                // Toggle delete icons on hover for the new chat text
                newChatText.addEventListener('mouseover', function () {
                    deleteIcon.style.display = 'inline';
                });

                newChatText.addEventListener('mouseout', function () {
                    deleteIcon.style.display = 'none';
                });

                activeNewChat.addEventListener('mouseover', function () {
                    activeNewChat.style.backgroundColor = "#ddd"
                });

                activeNewChat.addEventListener('mouseout', function () {
                    activeNewChat.style.backgroundColor = "whitesmoke"
                });


                // Hide the delete icon of the previous new chat
                if (activeNewChat) {
                    var previousDeleteIcon = activeNewChat.querySelector('.delete-icon');
                    if (previousDeleteIcon) {
                        previousDeleteIcon.style.display = 'none';
                        activeNewChat.style.backgroundColor = 'whitesmoke';
                    }
                }
            } else {
                activeNewChat.style.backgroundColor = '#ccc';
            }
        }



        // Call this function to initialize the chatData and newChatCounter on page load
        function initializeChatData() {
            // Add existing chats from chatData
            chatData.slice(0, 10).forEach(function (chatDetails) {
                // Use the addChatToSidebar function to add each chat to the sidebar
                addChatToSidebar(chatDetails);

            });
        }

        // Function to add a chat to the sidebar
        function addChatToSidebar(chatInfo) {
            var newChatText = document.createElement('div');
            newChatText.classList.add('days', 'new-chat-text');
            newChatText.innerHTML = chatInfo.name; // Adjust this based on your chatInfo structure

            // Append the new element to the sidebar
            document.querySelector('.sidebar').insertBefore(newChatText, document.querySelector('.text'));
        }

        // Call the function to initialize chat data
        initializeChatData();

        function openNav() {
            document.getElementById("sticky-top").style.top = "0";
            document.getElementById("mainContainer").style.marginLeft = "13.5%";
            document.getElementById("sidebar").style.marginLeft = "0";
            document.getElementById("howcan").style.marginLeft = "36%";
        }

        function closeNav() {
            document.getElementById("sticky-top").style.top = "-85px";
            document.getElementById("mainContainer").style.marginLeft = "0";
            document.getElementById("sidebar").style.marginLeft = "-13.5%";
            document.getElementById("howcan").style.marginLeft = "30%";
        }

        function slideUpStickyTop() {
            var stickyTop = document.getElementById('sticky-top');
            stickyTop.style.transition = 'top 0.5s ease'; // Smooth transition effect
            stickyTop.style.top = '-85px'; // Adjust the value for the desired slide-up distance
        }

        function slideDownStickyTop() {
            var stickyTop = document.getElementById('sticky-top');
            stickyTop.style.transition = 'top 0.5s ease'; // Smooth transition effect
            stickyTop.style.top = '0';
        }
        function sendMessage() {
            var userInput = document.getElementById('userInput').value.trim(); // Trim leading and trailing whitespace
            if (userInput !== '') {
                appendMessage('user', userInput);

                // Simulate AI typing before sending the response
                simulateTyping();

                // Send the user's message to the Flask server
                fetch('http://127.0.0.1:5000/api/ai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: userInput }),
                })
                    .then(response => response.json())
                    .then(data => {
                        // Assuming the server responds with the AI's message
                        var aiResponse = data.message;

                        // Stop simulating typing before showing the AI response
                        stopTyping();

                        // Display AI response with typing animation
                        displayWithTyping('bot', aiResponse);
                    })
                    .catch(error => console.error('Error:', error));

                // Clear the user input field
                hidehowcan();
                document.getElementById('userInput').value = '';
                document.getElementById('sendButton').style.backgroundColor = "gray";
            }
        }


        function simulateTyping() {
            var chatBox = document.getElementById('chatBox');
            var typingIndicator = document.createElement('div');
            typingIndicator.classList.add('bot', 'typing-animation');
            typingIndicator.innerHTML = 'AI is typing...';
            chatBox.appendChild(typingIndicator);
        }

        function stopTyping() {
            var chatBox = document.getElementById('chatBox');
            var typingIndicator = chatBox.querySelector('.typing-animation');
            if (typingIndicator) {
                chatBox.removeChild(typingIndicator);
            }
        }

        function displayWithTyping(sender, message) {
            var chatBox = document.getElementById('chatBox');
            var messageElement = document.createElement('div');
            messageElement.classList.add(sender);

            var senderText = sender === 'user' ? 'You' : '🤖';
            messageElement.innerHTML = `<strong>${senderText}:</strong> `;

            // Split the message into characters and display one by one with typing effect
            message.split('').forEach((char, index) => {
                setTimeout(() => {
                    messageElement.innerHTML += char;
                    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
                }, index * 10); // Adjust the timing as needed
            });

            // Add the message element to the chat box
            chatBox.appendChild(messageElement);
        }

        function appendMessage(sender, message) {
            var chatBox = document.getElementById('chatBox');
            var messageElement = document.createElement('div');
            messageElement.classList.add(sender);

            var senderText = sender === 'user' ? 'You' : 'AI';

            // Add spacing between messages
            var spacer = document.createElement('div');
            spacer.classList.add('spacer');
            chatBox.appendChild(spacer);

            messageElement.innerHTML = `<strong>${senderText}:</strong> ${message}`;
            chatBox.appendChild(messageElement);

            // Add a class for AI messages
            if (sender === 'bot') {
                messageElement.classList.add('ai-message');
            }

            // Scroll to the bottom to show the latest message
            chatBox.scrollTop = chatBox.scrollHeight;

        }
        // Function to start voice recognition
        function startVoiceRecognition() {
            var recognition = new webkitSpeechRecognition() || SpeechRecognition();
            recognition.lang = 'en-US';

            recognition.onresult = function (event) {
                var result = event.results[0][0].transcript;
                document.getElementById('userInput').value = result;
            };

            recognition.start();
        }

        // Function to reset chat box content
        function resetChat() {
            var chatBox = document.getElementById('chatBox');
            chatBox.innerHTML = ''; // Clear the inner HTML of the chat box
            setTimeout(function () {
                displayWelcomeMessage();
            }, 1000);
        }

        function resetChat2() {
            var chatBox = document.getElementById('chatBox');
            chatBox.innerHTML = ''; // Clear the inner HTML of the chat box
        }

        function hoverOpenBtn() {
            document.querySelector('.open-btn').innerHTML = '❱';
        }

        function unhoverOpenBtn() {
            document.querySelector('.open-btn').innerHTML = '❱';
        }

        function slideUpStickyTop() {
            var stickyTop = document.getElementById('sticky-top');
            stickyTop.style.transition = 'top 0.5s ease'; // Smooth transition effect
            stickyTop.style.top = '-85px'; // Adjust the value for the desired slide-up distance
        }

        function slideDownStickyTop() {
            var stickyTop = document.getElementById('sticky-top');
            stickyTop.style.transition = 'top 0.5s ease'; // Smooth transition effect
            stickyTop.style.top = '0';
        }

        function showNameInput() {
            // Display the name input modal
            document.getElementById('nameModal').style.display = 'flex';

            // Slide up the sticky-top during name input
            slideUpStickyTop();
        }

        function hideNameInput() {
            // Hide the name input modal
            document.getElementById('nameModal').style.display = 'none';

            // Slide down the sticky-top after name input
            slideDownStickyTop();
        }

        function slideDownAfterLogout() {
            // Slide down the sticky-top after logout
            slideDownStickyTop();
        }

        // Check if the user is already logged in
        var loggedInUser = localStorage.getItem('loggedInUser');
        var userSection = document.getElementById('userSection');
        var loggedInUserElement = document.getElementById('loggedInUser');
        var nameModal = document.getElementById('nameModal');

        // Initialize sticky-top state based on user login status
        if (loggedInUser) {
            // User is logged in
            userSection.style.display = 'block';
            loggedInUserElement.textContent = 'Logged in as: ' + loggedInUser;
            nameModal.style.display = 'none';

            // After login, slide down the sticky-top
            showhowcan();
            slideDownStickyTop();
        } else {
            // User is not logged in, slide up the sticky-top
            loginslideopen();
            loginslideopenRight();
            slideUpStickyTop();
        }

        // Function to handle login
        function login() {
            var username = document.getElementById('username').value;
            if (username.trim() !== '') {
                localStorage.setItem('loggedInUser', username);
                userSection.style.display = 'block';
                loggedInUserElement.textContent = 'Logged in as: ' + username;
                nameModal.style.display = 'none';

                // After login, slide down the sticky-top
                loginslideclose();
                loginslidecloseRight();
                setTimeout(function () {
                    openNav();
                    slideDownStickyTop();
                }, 300);
                setTimeout(function () {
                    showhowcan();
                    document.getElementById("user-input").style.display = "flex"
                    document.getElementById("disclaimer").style.display = "flex"
                }, 700);
                resetChat2();
                setTimeout(function () {
                    displayWelcomeMessage2();
                }, 1000);
            }
        }

        function logout() {
            closeNav();
            setTimeout(function () {
                loginslideopen();
                loginslideopenRight();
            }, 300);
            document.getElementById("user-input").style.display = "none"
            document.getElementById("disclaimer").style.display = "none"
            // Clear the newChatCounter, chatData, and loggedInUser from localStorage
            localStorage.removeItem('newChatCounter');
            localStorage.removeItem('chatData');
            localStorage.removeItem('loggedInUser');

            // Reset the newChatCounter and chatData array
            newChatCounter = 1;
            chatData = [];

            // Remove the 'active' class and background color from the previously active "New Chat" text
            var activeNewChat = document.querySelector('.new-chat-text.active');
            if (activeNewChat) {
                activeNewChat.classList.remove('active');
                activeNewChat.style.backgroundColor = ''; // Reset background color
            }

            // Clear the chat box
            resetChat2();

            // Remove all new chat elements from the sidebar
            var sidebar = document.querySelector('.sidebar');
            var newChatElements = document.querySelectorAll('.new-chat-text');
            newChatElements.forEach(function (element) {
                sidebar.removeChild(element);
            });

            // Slide up the sticky-top after logout
            userSection.style.display = 'none';
            nameModal.style.display = 'flex';
            slideUpStickyTop();
        }

        function deleteChat(chatDetails, chatElement) {
            // Remove the chat from chatData array
            chatData = chatData.filter(chat => chat.counter !== chatDetails.counter);

            // Remove the chat element from the sidebar
            var sidebar = document.querySelector('.sidebar');
            sidebar.removeChild(chatElement);

            // If the deleted chat was the currently active one, reset the chat box
            if (chatElement.classList.contains('active')) {
                resetChat2();
            }

            // If no more new chats exist, reset the new chat counter to 1
            if (chatData.length === 0) {
                newChatCounter = 1;
                // Give #ccc background color to the #currentchat text
                document.getElementById('currentchat').style.backgroundColor = '#ccc'
            }

            // Store updated chatData in localStorage
            localStorage.setItem('chatData', JSON.stringify(chatData));
            localStorage.setItem('newChatCounter', newChatCounter);

            // Get the previous new chat element and give it the #ccc background color
            var newChatElements = sidebar.querySelectorAll('.new-chat-text');
            var previousNewChat = newChatElements[newChatElements.length - 1];

            if (previousNewChat) {
                previousNewChat.style.backgroundColor = '#ccc';
                previousNewChat.style.transition = 'background-color 0.5s ease';
                previousNewChat.classList.add('active'); // Add 'active' class to make it active

                // Reset the chat box and display a welcome message
                resetChat();

                var chatBox = document.getElementById('chatBox');

                // Simulate AI typing before showing the welcome message
                simulateTyping();

                // Display the welcome message with typing animation
                displayWithTyping('bot', 'You created a new chat. How can I help you?');

                // Stop simulating typing after showing the welcome message
                stopTyping();

                // Scroll to the bottom to show the latest message
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        }

        function showDeleteIcon(chatId) {
            var deleteIcon = document.querySelector('.delete-icon[data-chat-id="' + chatId + '"]');
            if (deleteIcon) {
                deleteIcon.style.display = 'inline-block';
            }
        }

        function hideAllDeleteIcons() {
            var deleteIcons = document.querySelectorAll('.delete-icon');
            deleteIcons.forEach(function (icon) {
                icon.style.display = 'none';
            });
        }
        //Function to handle delete icon click
        function handleDeleteClick(deleteIcon) {
            // Your logic to handle delete click
            console.log('Delete icon clicked!');
            // For example, you can remove the entire chat item
            deleteIcon.parentNode.remove();
        }

        // Function to toggle delete icons on chat item hover
        function toggleDeleteIcons() {
            const chatList = document.getElementById('chatList');
            const chatItems = chatList.querySelectorAll('li');

            chatItems.forEach(chatItem => {
                chatItem.addEventListener('mouseover', () => {
                    const deleteIcon = chatItem.querySelector('.delete-icon');
                    deleteIcon.style.display = 'inline';
                });

                chatItem.addEventListener('mouseout', () => {
                    const deleteIcon = chatItem.querySelector('.delete-icon');
                    deleteIcon.style.display = 'none';
                });
            });
        }

        // Call the function to set up event listeners
        toggleDeleteIcons();