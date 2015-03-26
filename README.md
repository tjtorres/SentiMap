# SentiMap
Web app for realtime sentiment analysis and mapping of tweets. 

##Initial Configuration##
This application requires both Redis and MongoDB. In order to run it you'll need to download each and then start both `mongod` and `redis-server`. 

You'll also need to configure both python files, and the JavaScript file plot.js. 

###Stream_Mod.py###
First install all dependencies:

```sh
pip install nltk numpy sklearn gensim pymongo setproctitle

```
Then download the NLTK stop words file as described in the [documentation](http://www.nltk.org/data.html). 

```python
>>> import nltk
>>> nltk.download()
```

Next you'll need to sign up for Twitter API access credentials by registering for an application, then filling in your Twitter Oauth credentials in the variables:

```python
access_token = "ACCESS_TOKEN"
access_token_secret = "ACCESS_TOKEN_SECRET"
consumer_key = "CONSUMER_KEY"
consumer_secret = "CONSUMER_SECRET"
``` 

The same is necessary for the Bing Translator API. Head over to the Azure Marketplace and register for authorization credentials, then subscribe to the Translator dat a product if you want to access the translation features of the streamer so that you can handle multiple languages. (NOTE: The Bing Translator API only allows for 2,000,000 characters per month for the free tier.) 

When you are finished you should supply your access credentials via the variables:


```python
client_ID = "CLIENT_ID"
client_secret="CLIENT_SECRET"
```

Finally you'll need to download the [Google Word2Vec Training Vectors](https://drive.google.com/file/d/0B7XkCwpI5KDYNlNUTTlSS21pQmM/edit), extract the binary file, and place it in `static/Data/`. 

Run Stream_Mod.py to initialize the database and start classifying and storing tweets.  

###SentiMap.py###

Install dependencies:

```sh
pip install redis flask pymongo

```
Start SentiMap.py to run the flask server. The web server will run by default on `localhost:5000`.


###Runtime###
When you want to start, first run `Stream_Mod.py` to set up the database structure and start listening for tweets (this will take a while to start, because the Google vectors binary file is large and takes a while to load into memory). After you've started `Stream_Mod.py` you can move on to starting `SentiMap.py`. 







