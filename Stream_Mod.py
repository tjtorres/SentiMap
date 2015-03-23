from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
from tweepy import Stream
from microsofttranslator import Translator
import re
import time
import json
import codecs
import csv
import sys
from pymongo import MongoClient, Connection
from datetime import datetime
import gensim as gs
import numpy as np
from sklearn.naive_bayes import GaussianNB
from sklearn.externals import joblib
from nltk.corpus import stopwords
from setproctitle import *

setproctitle('Stream_Mod')


###################################################################################
####################Variables that contain the user credentials for the Twitter API 
access_token = "ACCESS_TOKEN"
access_token_secret = "ACCESS_TOKEN_SECRET"
consumer_key = "CONSUMER_KEY"
consumer_secret = "CONSUMER_SECRET"
####################################################################################

####################################################################################
###############Variables that contain the user credentials for the Azure Translator
client_ID = "CLIENT_ID"
client_secret="CLIENT_SECRET"
####################################################################################

#RE's for stripping unicode emoji and multiple letter instances. 
emoji = re.compile(u'[^\x00-\x7F\x80-\xFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]',re.UNICODE)
multiple = re.compile(r"(.)\1{1,}", re.DOTALL)


#Microsoft Translator Instance
    
translator = Translator(client_ID, client_secret )

####################################################################################
############################### Database Setup #####################################
####################################################################################

client = Connection()

db = client.streamer
if 'tweets' in db.collection_names():
    print "Collection 'tweets' already exists"
    coll = db.tweets
else:
    print "Creating Collection: 'tweets' ... "
    db.create_collection('tweets',capped=True, size=200000, max= 3000 )
    coll = db.tweets
    

########################################################################

#Takes three arguments 
#INPUT: (phrase=string-to-vectorize, stop=set-of-stopwords, model=loaded-word2vec-model)
#OUTPUT: Average of word vectors in string.
def phrase2vec(phrase,stop, model):
    phrase = phrase.lower().split()
    phrase_fil = [w for w in phrase if not w in stop]
    size = 0
    vec = np.zeros(300)
    for word in phrase_fil:
        try:
            vec= np.add(vec,model[word])
            size+=1
        except:
            pass
    if size==0:
        size=1
    return np.divide(vec,size)
    
#Takes 4 arguments
#INPUT: (text=String to sentimentize, stop= stopword set, model= w2v-model, trained_classifier = sklearn classifier model)
def get_sentiment(text, stop , model, trained_classifier):
    cl = trained_classifier
    vec = phrase2vec(text,stop,model)
    pred = cl.predict_proba(vec)[0][1]
    return pred
    
    
    
    
    
    
#Twitter API Listener Class, inherits from tweepy.streaming.StreamListener
class Listener(StreamListener):
    
    def __init__(self, classifier, stops, model):
        self.cl = classifier
        self.stop = stops
        self.model = model
    
        
    
    def on_data(self, data):
        #parse json from data event
        elem = json.loads(data)
        
            
            
        #### If geotagged filter text ####
        if 'coordinates' in elem:
            if elem['coordinates']!=None:
                #filter off emoji, urls, @Names, &amp; (etc.), symbols, "RT", and '#'
                stripped = emoji.sub('',elem['text'])
                stripped = re.sub(r'http[s]?[^\s]+','', stripped)
                stripped = re.sub(r'(@[A-Za-z0-9\_]+)' , "" ,stripped)
                stripped = re.sub(r'[\&].*;','',stripped)
                stripped = re.sub(r'[#|\!|\-|\+|:|//]', " ", stripped)
                stripped = re.sub( 'RT.','', stripped)
                stripped = re.sub('[\s]+' ,' ', stripped).strip()
                    
                #print stripped
                #### Translate in not in English ####
                if elem['lang'] !=  'en' and elem['lang'] !=  'en-gb':
                    try:
                        
                        translated_text = translator.translate(stripped , 'en', elem['lang'])
                    except:
                        translated_text = ""
                else:
                    translated_text = stripped
                   
                #Tweet must be longer than 2 words after filtering.    
                if len(translated_text.split()) > 2:
                        
                    sentiment = get_sentiment(translated_text,self.stop ,self.model, self.cl)
                    #after translation filter down multiple letters to 2, no non-latin alphanumric characters
                    output = multiple.sub(r"\1\1", translated_text)
                    output = re.sub('[^a-zA-Z0-9|\']', " ", output).strip()
                
                
                    lat = elem['coordinates']['coordinates'][1]
                    lon = elem['coordinates']['coordinates'][0]
                    text = elem['text'].strip()
                    trans = output
                
                    #setup message containing cooordinates, unfiltered text, translated and filtered text,
                    #time, and sentiment value (0-1).
                    message = {'lon': lon, 'lat': lat , 'text': text, 'trans': trans ,\
                    'time':datetime.utcnow(), 'sent': sentiment }
                    
                    #add message to mongo collection.
                    coll.insert(message)
                    
                    

                    
                    
        return True


    def on_error(self, status):
        print status
        
        
        
        
if __name__ == '__main__':
    

    print "Loading Classifier...\n\n"
    #load trained sklearn classifier
    cl=joblib.load('./static/Data/PKL/RFC/random_forest_avg.pkl')
    
    
    print "Classifier Loaded...loading model...\n\n"
    #load w2v vectors from GoogleNews training set. 
    model= gs.models.Word2Vec.load_word2vec_format('./static/Data/GoogleNews-vectors-negative300.bin', binary=True)
    
    
    print "Model Loaded...\n\n"
    #load set of stop words
    stop_set = set(stopwords.words("english"))
    


    
    l = Listener(cl,stop_set,model)
    
    #Oauth Handling
    auth = OAuthHandler(consumer_key, consumer_secret)
    auth.set_access_token(access_token, access_token_secret)
    
    stream = Stream(auth, l)
    print "Listening..."
    stream.sample()