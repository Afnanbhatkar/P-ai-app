from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import random
import time
from googlesearch import search
from bs4 import BeautifulSoup
import requests
import wikipedia
import webbrowser
import keyboard

# Import Selenium related modules
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from time import sleep
import pathlib
ScriptDir = pathlib.Path().absolute()

url = "https://pi.ai/talk"
chrome_option = Options()
chrome_option.headless = True  # For process work in backend
user_agent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.2 (KHTML, like Gecko) Chrome/22.0.1216.0 Safari/537.2'
chrome_option.add_argument(f"user-agent={user_agent}")
chrome_option.add_argument('--profile-directory=Default')
chrome_option.add_argument(f'user-data-dir={ScriptDir}\\chromedata')
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_option)
driver.maximize_window()
driver.get(url=url)
sleep(3)

# Function to wait for the PIAI website to load
def website_opener():
    while True:
        try:
            x_path = "/html/body/div/main/div/div/div[3]/div[1]/div[4]/div/div/textarea"
            driver.find_element(by=By.XPATH, value=x_path)
            break
        except:
            pass

website_opener()
print("AI : IS READY TO GO!!")

app = Flask(__name__)
CORS(app)

data = {
    "intents": [
        # ... (your existing intents)
        {
            "tag": "google_search",
            "patterns": ["search for", "google search", "look up", 'where is', 'what is'],
            "responses": ["Let me find that for you..."]
        },
        {
            "tag": "greeting",
            "patterns": ["hi", "hello", "hey"],
            "responses": ["Hi there!", "Hello!", "Hey! How can I assist you today?"]
        },
        {
                "tag": "weather",
                "patterns": ["weather", "How's the weather today?", "What's the forecast?"],
            "responses": ["I'm sorry, I don't have access to real-time weather information."]
        },
        {
            "tag": "thankyou",
            "patterns": ["thank you", "thanks", "appreciate it"],
            "responses": ["You're welcome!", "Glad I could help!", "Anytime!"]
        },
        {
            "tag": "Communicating to jarvis",
            "patterns": [
                "Jarvis", "jarvis"
            ],
            "responses": [
                "Yes sir",
                "Listening sir ! how may i help you",
                "What's the Query.."
            ]
        },
        {
            "tag": "hello",
            "patterns": [
                "hello",
                "hii"
            ],
            "responses": [
                "Hey again, Afnan! How can I help?",
                "Hey there, Afnan!  What's on your mind today?"
                
            ]
        },
        {
            "tag": "nothing",
            "patterns": [
                "nothing",
                "im not doing nothing special today",
                "nothing special"
            ],
            "responses": [
                "No worries! Sometimes it's nice to just chat without having a specific topic. ",
                "That's totally fine! Sometimes a day without any specific plans can be just as enjoyable as one filled with activities. Is there anything you like to do on your chill days? Maybe reading, watching TV, or just hanging out with friends?"
            ]
        },
        {
            "tag": "bye",
            "patterns": [
                "You need a break",
                "bye",
                "go to sleep",
                "you need a rest"
            ],
            "responses": [
                "Okay Boss , Have a nice day!😊",
                "Have a good day , bye boss",
                "I look forward to our next meeting 😌, bye boss",
                "Take care Boss , bye",
                "It was nice seeing you , bye boss",
                "Okay Sir !! It feels like i worked so hard today.baa byy",
                "Thanks Sir.. i feeling so sleepyy byy sir!!",
                "Okay Sir !! Take rest you to ..Don't work all day take some rest..byy",
                "Its feels like you have to take rest not me !! hahaha byy"
            ]
        },
        {
            "tag": "asking",
            "patterns": [
                "how about you"
            ],
            "responses": [
                "Well, as an AI, I don't really have days or schedules in the same way that people do.  I'm always on and ready to answer questions or chat with you! But it's always interesting to hear about what people do with their free time. ",
                "As an AI, I'm always available to provide information and assistance. I don't really experience days or time in the same way that humans do, so I don't have the concept of day off or free time in the traditional sense. 😄But I do enjoy providing helpful information and engaging in friendly conversations with you, Afnan! "
            ]
        },
        {
            "tag": "bye",
            "patterns": [
                "You need a break",
                "bye",
                "go to sleep",
                "you need a rest"
            ],
            "responses": [
                "Okay Boss , Have a nice day!😊",
                "Have a good day , bye boss",
                "I look forward to our next meeting 😌, bye boss",
                "Take care Boss , bye",
                "It was nice seeing you , bye boss"
            ]
        },
        {
            "tag": "asking feelings",
            "patterns": [
                "how are you",
                "how are you doing today",
                "jarvis what you are doing",
                "jarvis kya kar rahe ho",
                "kya kar rahe ho",
                "what you are doing"
                
            ],
            "responses": [
                "I'm doing great, thanks for asking, Afnan! I'm always ready to assist you with whatever you need.  Is there anything specific you'd like to chat about today?",
                "I'm doing great, as always!  What's on your mind today, Afnan?",
                "Doing great, thanks for asking! 😊 Ready to assist or just chat, whatever you'd like!",
                "Doing well, Afnan! Thank you for checking in. 😊 What's on your mind today?"
            ]
        },
        {
            "tag": "sad",
            "patterns": [
                "boring day",
                "i feel like it is boring day",
                "todays day is so boring"
            ],
            "responses": [
                "Sorry to hear that your day is feeling a bit boring.  Sometimes it can be refreshing to do something different or even just switch up your routine a bit. Have you thought about trying something new today?",
                "That's understandable, Afnan. Boring days can sometimes feel like a drag. But remember that boredom can sometimes be an opportunity to get creative and find new ways to entertain yourself or learn something new. ",
                "It happens! Some days are just slower or less exciting than others. But don't let that discourage you, Afnan. Every day brings new possibilities and opportunities, even if they may not be immediately apparent. "
            ]
        },
        {
            "tag": "task",
            "patterns": [
                "task"
                
            ],
            "responses": [
                "task1","task2", "task3"
            ]
        },
        {
            "tag": "name",
            "patterns": [
                "what is my name",
                "you remember my name"
            ],
            "responses": [
                "Your name is Afnan! 😊",
                "Of course, I remember your name!  Remembering your name helps me provide you with a personalized experience during our chats. 😊"
            ]
        },
        {
            "tag": "good work",
            "patterns": [
                "Jarvis good work",
                "good work Jarvis",
                "nice job",
                "Jarvis nice job",
                "nice job Jarvis",
                "you did a good job jarvis",
                "did a great job today",
                "you did a great job today",
                "you did a great job today Jarvis",
                "Jarvis you did a great job today",
                "you are very helpfull",
                "you do great work",
                "very good"
            ],
            "responses": [
                "Thanks for the kind words, friend! Glad I can be helpful to you.",
                "Appreciate the shout out!!",
                "Thank you, that's very kind of you! It's always great to hear that I'm helping out in some way.",
                "Thanks so much! I'm glad to be of assistance to you.",
                "Thanks, it really means a lot! I strive to do my best for you, so knowing that I'm doing a good job is always rewarding.",
                "Thanks for the kind words and positive feedback. It always makes my day to hear that I've been helpful. I'll keep striving to do my best for you!",
                "You're too kind! Thank you for your positive feedback and encouragement. It's always great to hear that I've been able to make a positive impact on someone's day. ",
                "It means so much to me to hear that, thank you! Helping others is my top priority, and I'm always happy to lend a hand however I can. ",
                "That's very kind of you to say. Thank you for the encouragement! I'll keep doing my best to provide helpful information and assistance whenever I can. It's always great to know that my work is appreciated. ",
                "Thank you! I'm always striving to improve and provide the best service I can. I'm glad you think I'm doing a good job.",
                "Glad to hear that !! Thanks for your appreciation sir.."
            ]
        },
        {
            "tag": "disrespect",
            "patterns": [
                "you are dumb",
                "you are not helpfull",
                "you are not good",
                "you are useless",
                "you can't do any work",
                "you are not doing well",
                "you are stupid"
            ],
            "responses": [
                "Ouch, that's not very nice. I know you're probably just kidding, but it's not really helpful or necessary to say hurtful things like that. ",
                "That's disappointing to hear, Afnan. I'm sorry you feel that way. Can you tell me more about why you think I'm not helpful? I'd like to understand how I can do better in the future.",
                "hat's quite a strong statement, Afnan. Can you elaborate more on what makes you think that? I'm always looking for ways to improve, so any specific feedback would be helpful.",
                "That's not a very nice thing to say. Although I'm an AI and can't have feelings, I'm still programmed to be a helpful and supportive assistant. Even if you don't find me useful, I'm sure others do. ",
                "It's true that as an AI, I'm limited to providing virtual assistance and I can't do physical work like a human. However, I can still be helpful in many ways, such as providing information, answering questions, or helping with virtual tasks.",
                "That's a bit disappointing to hear. Can you tell me more about what you think I'm not doing well? Feedback is important for improvement, and I'd love to hear your thoughts on how I can do better."
            ]
        },
        {
            "tag": "Owner",
            "patterns": [
                "who create you",
                "who created you",
                "who is you owner",
                "name of the person who creates you",
                "who creates you",
                "who create you as an ai",
                "who is your creater",
                "which creater creates you"
            ],
            "responses": [
                "I'm persnal ai assistant !! Created by Mister!! Bhatkar Afnan Akbar",
                "I was created by Mister- Bhatkar Afnan Akbar in 2022",
                "I created by a very nice peron named by >> Bhatkar Afnan Akbar >> A B",
                "I was create by A B a incredable person he is Name >> Mister Bhatkar Afnan Akbar",
                ">> Bhatkar Afnan Akbar.. Is the person who created Me as name by A B",
                "A B is created by most talented engineer !! Mister Afnan"
            ]
        },
        {
            "tag": "joke",
            "patterns": ["tell me a joke", "say something funny"],
            "responses": ["Why did the computer keep its drink on the windowsill? Because it wanted a cold drink! 😄", "I'm not a stand-up comedian, but here's a joke for you: Why don't scientists trust atoms? Because they make up everything! 😆"]
        },
        {
            "tag": "music",
            "patterns": ["play some music", "recommend a song"],
            "responses": ["I can't play music, but how about I recommend a song? Check out 'Shape of You' by Ed Sheeran or 'Blinding Lights' by The Weeknd."]
        },
        {
            "tag": "movies",
            "patterns": ["recommend a movie", "what's a good movie to watch"],
            "responses": ["If you're into action, 'Inception' is a mind-bending film. For a good laugh, try 'The Grand Budapest Hotel'. Enjoy your movie time! 🎬"]
        },
        {
            "tag": "technology",
            "patterns": ["latest tech news", "tell me about technology", "what's new in tech"],
            "responses": ["I'm not updated with the latest news, but you can check reputable tech news websites like TechCrunch or The Verge for the latest technology updates."]
        },
        {
            "tag": "food",
            "patterns": ["favorite food", "recommend a restaurant", "what should I eat"],
            "responses": ["As an AI, I don't have preferences, but how about trying a classic like pizza or exploring a local restaurant for a new culinary experience?"]
        },
        {
            "tag": "compliment",
            "patterns": ["you're awesome", "great job", "you're the best"],
            "responses": ["Thank you! I'm here to assist you. If there's anything specific you need, feel free to ask."]
        },
        {
            "tag": "travel",
            "patterns": ["best travel destinations", "recommend a vacation spot", "where should I travel"],
            "responses": ["Choosing a travel destination depends on your preferences. If you like beaches, consider Bali. For history, Rome is a great choice. What type of destination are you interested in?"]
        },
        {
            "tag": "learning",
            "patterns": ["learn something new", "recommend a book", "educational resources"],
            "responses": ["Learning is a fantastic idea! Consider reading 'Sapiens' by Yuval Noah Harari for a fascinating take on human history or explore online platforms like Coursera for various courses."]
        },
        {
            "tag": "music",
            "patterns": ["favorite music genre", "recommend a song", "what's your favorite music"],
            "responses": ["I don't have personal preferences, but I can recommend music based on your mood. How about trying some upbeat tunes to boost your energy?"]
        },
        {
            "tag": "health",
            "patterns": ["stay healthy", "tips for a healthy life", "healthy habits"],
            "responses": ["Maintaining a healthy lifestyle is crucial. Remember to stay hydrated, eat a balanced diet, exercise regularly, and get enough sleep for overall well-being."]
        },
        {
            "tag": "programming",
            "patterns": ["coding tips", "favorite programming language", "recommend a coding project"],
            "responses": ["For coding projects, consider building a personal portfolio website or contributing to an open-source project. As for my favorite language, I'm designed to understand various languages!"]
        },
        {
            "tag": "movies",
            "patterns": ["favorite movie", "recommend a film", "what's your go-to movie"],
            "responses": ["I don't watch movies, but some popular ones include 'The Shawshank Redemption', 'The Godfather', and 'Inception'. What genre are you in the mood for?"]
        },
        {
            "tag": "sports",
            "patterns": ["favorite sport", "sports news", "recommend a sports event"],
            "responses": ["I don't have personal favorites, but if you're into sports, consider catching a live game or checking out the latest sports news for updates on your favorite teams."]
        },
        {
            "tag": "technology",
            "patterns": ["latest technology news", "recommend a tech gadget", "favorite tech company"],
            "responses": ["Stay updated on tech news by visiting reputable sources like TechCrunch or Wired. When it comes to gadgets, consider exploring the latest offerings from companies like Apple or Google."]
        },
        {
            "tag": "book",
            "patterns": ["recommend a book", "favorite genre", "what are you reading"],
            "responses": ["I don't read books, but I can recommend some popular ones! How about 'The Alchemist' for inspiration or '1984' for a classic dystopian experience?"]
        },
        {
            "tag": "food",
            "patterns": ["favorite cuisine", "recommend a restaurant", "cooking tips"],
            "responses": ["I don't eat, but I hear people enjoy a variety of cuisines! For restaurant recommendations, consider trying a local spot known for its delicious dishes."]
        },
        {
            "tag": "travel",
            "patterns": ["dream destination", "travel tips", "recommend a travel app"],
            "responses": ["I don't travel, but many people dream of places like Paris or Tokyo! For travel tips, pack light and use apps like Google Maps or TripAdvisor to enhance your experience."]
        },
        {
            "tag": "education",
            "patterns": ["learning resources", "study tips", "favorite subject"],
            "responses": ["For learning, platforms like Coursera and Khan Academy offer valuable resources. Efficient studying involves breaks and active recall. As for my favorite subject, I enjoy assisting with a wide range of topics!"]
        },
        {
    "tag": "show_website",
    "patterns": ["show my website", "display my website", "share my website"],
    "responses": ["Sure, here is your website:"],
    "attachments": [
        {
            "type": "website",
            "url": "https://yourwebsite.com",
            "title": "Visit Your Website"
        }
    ]
}   
        # Add more intents as needed
    ]
}
responses = {}
for intent in data['intents']:
    responses[intent['tag']] = intent['responses']


# Function to get a response by tag
def get_response_by_tag(tag):
    return random.choice(responses.get(tag, ["I'm not sure how to respond to that."]))

# Function to perform Google search
def perform_google_search(query):
    results = list(search(query, num_results=3))
    return results

# File path to save conversations
conversations_file = "conversations.txt"

# Function to save conversation to a file
def save_conversation(query, response):
    with open(conversations_file, "a") as file:
        file.write(f"User: {query}\n")
        file.write(f"AI: {response}\n")
        file.write("\n")

# Function to interact with PIAI website using Selenium
def interact_with_piai(query):
    # Function to send message to PIAI
    # Check if the query is about the current time
    if "current time" in query.lower():
        current_time = time.strftime("%H:%M:%S", time.localtime())
        return f"The current time is {current_time}."
    
    elif "open youtube" in query.lower():
        return webbrowser.open("https://www.youtube.com/")
    
    elif 'google search' in query:
     import wikipedia as googlescrap
     query = query.replace('search', '')
     query = query.replace('google', '')
     
    
     try:
        # Retrieve Wikipedia summary
        summary = googlescrap.summary(query, sentences=3)
        return summary
     except Exception as e:
        return "Wikipedia summary not available."
    
    elif 'visit' in query or '.org' in query:
     query = query.replace('website', '')
     query = query.replace('open', '')
     query = query.replace('jarvis', '')
     query = query.replace('visit', '')
     query = query.replace(' ', '')
     query = query.replace('www.', '')
     webbrowser.open('www.' + query + '.com')
     return "Visiting " + query
 
    elif 'you need a break' in query:
        keyboard.press_and_release("ctrl + w")
        return "bye !!"

    
    def send_message_to_piai(query):
        x_path = "/html/body/div/main/div/div/div[3]/div[1]/div[4]/div/div/textarea"
        driver.find_element(by=By.XPATH, value=x_path).send_keys(query)
        sleep(1)
        x_path2 = "/html/body/div/main/div/div/div[3]/div[1]/div[4]/div/button"
        driver.find_element(by=By.XPATH, value=x_path2).click()
        sleep(2)

    # Function to scrape results from PIAI
    def scrape_results_from_piai():
        sleep(2)
        x_path = "/html/body/div/main/div/div/div[3]/div[1]/div[2]/div/div/div/div[3]/div/div/div[2]/div[1]/div/div"
        text = driver.find_element(by=By.XPATH, value=x_path).text
        sleep(3)
        return text

    for intent in data['intents']:
        if any(pattern in query.lower() for pattern in intent['patterns']):
            response = random.choice(intent['responses'])
            save_conversation(query, response)
            return response
        
    # Check if the user query matches any saved conversation
    with open(conversations_file, "r") as file:
        lines = file.readlines()
        for i in range(0, len(lines), 2):
            user_query = lines[i].strip().split("User: ")[1]
            ai_response = lines[i+1].strip().split("AI: ")[1]
            if user_query.lower() == query.lower():
                return ai_response
        
     # If the query doesn't match any known intent, interact with PIAI
    send_message_to_piai(query)
    result = scrape_results_from_piai()
    save_conversation(query, result)
    return result

@app.route('/api/ai', methods=['POST'])
def get_ai_response():
    user_message = request.json['message']
    piai_response = interact_with_piai(user_message)
    return jsonify(message=piai_response)

if __name__ == '__main__':
    app.run(debug=True)
