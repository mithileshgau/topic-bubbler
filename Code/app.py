from fastapi import FastAPI, HTTPException
import pandas as pd
import init
import json
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5502"],  # Update this with your frontend URL
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Open the JSON file
with open('../data/topic_subtopic_data.json') as file:
    # Load the data into a dictionary
    topicData = json.load(file)

@app.post("/keywords/")
async def extractKeyWords(data: dict):

    # topics = init.topics
    try:
        # print(data)

        if data["key"] == 'total':
            # all topics selected
            return init.getTotalKeywords(data["intensity"])
        elif data["key"] == 'topic':
            # specific topic selected
            return init.getTopicKeywords(data["value"], data["intensity"])
        elif data["key"] == 'subtopic':
            # specific subtopic selected
            print("subtopic")
            return init.getSubTopicKeywords(data["value"], data["intensity"])

        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))