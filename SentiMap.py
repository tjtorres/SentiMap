import sys
import json
import redis
import signal
from threading import Thread
from flask import Flask, render_template, request, abort, make_response, Response, jsonify
from pymongo import Connection
from bson import json_util
from setproctitle import *


setproctitle('SentiMap')
DATABASE_NAME = 'streamer'
TWEET_COLLECTION = 'tweets'


#Redis Instance
red = redis.StrictRedis()

def signal_handler(signal, frame):
    print 'You pressed Ctrl+C!'
    sys.exit(0)


#Function to publish all tweets in Database
def publisher_thread():
    print "Initializing Publisher..."
    db = Connection().streamer
    coll = db.tweets
    cursor = coll.find({},{"_id" : 0, "time": 0},tailable=True,timeout=False)
    ci=0
    while cursor.alive:
        try:
            doc = cursor.next()
            ci += 1
            red.publish('stream', u'%s' % json.dumps(doc,default=json_util.default))
        except StopIteration:
            pass


#Function to push all tweets on initial request.            
def push_all():
    tw_json =[]
    print "pushing all tweets"
    db = Connection().streamer
    coll = db.tweets
    cursor = coll.find({},{"_id" : 0, "time": 0})
    ci=0
    while cursor.alive:
        try:
            ci+=1
            print ci
            doc = cursor.next()
            tw_json.append(doc)
        except StopIteration:
            pass
    print "data returned\n\n"
    return  tw_json 
        
    
    
    
    
    
#Listener to push tweets from the publish queue via event stream. 
def event_stream():
    pubsub = red.pubsub()
    pubsub.subscribe('stream')
    i=0
    for message in pubsub.listen():
        i+=1
        print 'data: %s\n\n' % message['data']
        yield 'data: %s\n\n' % message['data']
        
        
# Setup Flask and SocketIO

app = Flask(__name__)


#Set debug equal to True for testing...
#app.debug=True


######################################################################
################### Flask Routing ####################################
######################################################################

@app.route('/')
def index():
    return render_template('index.html')
    
@app.route('/init')
def getpoints():
    return jsonify( items = push_all())

    
@app.route('/tweets')
def tweets():
    return Response(event_stream(), headers={'Content-Type':'text/event-stream'})

def runThread():
    st = Thread( target = publisher_thread )
    st.start()
    
if __name__=='__main__':
    signal.signal(signal.SIGINT, signal_handler)
    app.before_first_request(runThread)
    app.run(threaded=True, host='0.0.0.0')
    


    
    










