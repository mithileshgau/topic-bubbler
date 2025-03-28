import pandas as pd
from collections import Counter
import ast
import json
import numpy as np
import math

def getTotalKeywords(intensity_value):
    df = pd.read_csv('../data/Covid-data-with-topic-names.csv')

    # intensity filter
    # read the data/textrank_overall_output.json file
    with open('../data/textrank_overall_output.json') as file:
        # Load the data into a dictionary
        textrank_overall_words = json.load(file)
    
    # min-max normalise the textrank_overall_words to 0-10
    textrank_overall_words = {k: (v - min(textrank_overall_words.values())) / (max(textrank_overall_words.values()) - min(textrank_overall_words.values())) * 10 for k, v in textrank_overall_words.items()}

        

    # read the data/textrank_output.json file
    with open('../data/textrank_output.json') as file:
        # Load the data into a dictionary
        textrank_words = json.load(file)

    # get topicwise frequency proportion
    # group by topic
    grouped_data_topic = df.groupby(['Topic_'])

    keyword_freq = {}

    total_keywords = 0

    # calculate frequency of words in each topic
    for topic, row in grouped_data_topic:
        words = [word for text in row['Preprocessed_Text'] for word in ast.literal_eval(text)]
        keyword_freq[topic[0]] = len(words)
        total_keywords += len(words)

    # update the frequency to percentage * 2 pie
    for key in keyword_freq.keys():
        keyword_freq[key] = keyword_freq[key] / total_keywords * 2 * math.pi
    
    # Group the data by month and topic
    grouped_data = df.groupby(['month', 'Topic_'])

    # Initialize a dictionary to store the top 5 frequent words for each topic and each month
    top_words = {"Topics": list(df['Topic_'].unique()), "Min_freq": 0, "Max_freq": 0, "Data": []}


    # Calculate the correlation matrix for all words
    correlation_matrix = pd.read_csv('../data/correlation_matrix.csv', index_col=0)

    all_top_5_words = []

    # Iterate over the groups
    for (month, topic), group in grouped_data:
        # Concatenate all the text arrays into one list
        words = [word for text in group['Preprocessed_Text'] for word in ast.literal_eval(text)]
        # Count the frequency of words
        counter = Counter(words)
        if intensity_value == 0:
            # Get the top 5 frequent words
            top_5_words = counter.most_common(5)
        else:
            # filter words based on intensity and sort in reverse order

            textrank_overall_words_current = {k: v for k, v in textrank_overall_words.items() 
                                              if v <= intensity_value and k in words}
            textrank_overall_words_current = dict(sorted(textrank_overall_words_current.items(), 
                                                key=lambda x: x[1], reverse=True))
            
            # Append the top 5 words and their frequencies to the all_top_5_words array
            top_5_words = list(textrank_overall_words_current.items())[:5]
            top_5_words = [(word, counter[word]) for word, _ in top_5_words]
        all_top_5_words += top_5_words
    # get the key from all the top 5 words
    freq_words = dict(all_top_5_words).keys()

    outer_radius_freq = {}

    for topic, row in grouped_data_topic:

        topic_words = [word for text in row['Preprocessed_Text'] for word in ast.literal_eval(text)]

        topic_words_counter = Counter(topic_words)

        outer_radius_freq[topic[0]] = {}

        # group by sub topic
        subgrouped_data = df[df["Topic_"] == topic[0]].groupby(['Sub-Topic_'])
        for sub_topic, subgroup in subgrouped_data:
            words = [word for text in subgroup['Preprocessed_Text'] for word in ast.literal_eval(text)]

            # Count the frequency of words
            counter = Counter(words)
            outer_radius_freq[topic[0]][sub_topic[0]] = {}
            for word in freq_words:
                if word in counter:
                    outer_radius_freq[topic[0]][sub_topic[0]][word] = counter[word] / topic_words_counter[word] * 2 * math.pi

    # print(outer_radius_freq)

    

    min_freq = min([freq for _, freq in all_top_5_words])
    max_freq = max([freq for _, freq in all_top_5_words])

    top_words["Min_freq"] = min_freq
    top_words["Max_freq"] = max_freq

    
    
    for (month, topic), group in grouped_data:
        # Concatenate all the text arrays into one list
        words = [word for text in group['Preprocessed_Text'] for word in ast.literal_eval(text)]

        # Count the frequency of words
        counter = Counter(words)
        
        if intensity_value == 0:
            # Get the top 5 frequent words
            top_5_words = counter.most_common(5)
        else:
            # filter words based on intensity and sort in reverse order

            textrank_overall_words_current = {k: v for k, v in textrank_overall_words.items() 
                                              if v <= intensity_value and k in words}
            textrank_overall_words_current = dict(sorted(textrank_overall_words_current.items(), 
                                                key=lambda x: x[1], reverse=True))
            # Append the top 5 words and their frequencies to the all_top_5_words array
            top_5_words = list(textrank_overall_words_current.items())[:5]

            # print("top_5_words",top_5_words)
            # replace the value with frequency from counter
            top_5_words = [(word, counter[word]) for word, _ in top_5_words]

        # Store the top 5 frequent words in the dictionary
        for index, (current_word, freq) in enumerate(top_5_words, start=1):
            # Get the correlation scores for the word from the correlation matrix
            correlation_array = correlation_matrix[current_word].to_dict()

            # Filter the correlation array to only include words that are in the top_5_words array
            correlation_array = {k: v for k, v in correlation_array.items() if k in freq_words}

            # Set the value of the current word to the maximum value in the correlation array
            correlation_array[current_word] = max(correlation_array.values())

            # get min and max values from the correlation array
            min_corr = min(correlation_array.values())
            max_corr = max(correlation_array.values())

            # Get the two words with the maximum values in the correlation array
            correlated_words = sorted(correlation_array, key=correlation_array.get, reverse=True)[:3]

            closest_freq_words = sorted(all_top_5_words, key=lambda x: abs(x[1] - freq))
            closest_freq_words = list(set([word for word, _ in closest_freq_words]))[:5]

            # remove current word from closest_freq_words and correlated_words
            if current_word in closest_freq_words:
                closest_freq_words.remove(current_word)
            if current_word in correlated_words:
                correlated_words.remove(current_word)

            # get 2 words from closest_freq_words which are not in correlated_words
            related_words = []
            related_words += correlated_words[:2]

            for word in closest_freq_words:
                if len(related_words) == 4:
                    break
                if word not in correlated_words:
                    related_words.append(word)

            textrank_data = {}

            for key in textrank_words[topic].keys():
                textrank_data.update(textrank_words[topic][key])

            # filter the data from textrank_data to only include words that are in all_top_5_words
            textrank_data = {k: v for k, v in textrank_data.items() if k in freq_words}


            current_word_text_rank = textrank_data[current_word]


            sorted_textrank = sorted(textrank_data.items(), key=lambda x: abs(x[1] - current_word_text_rank))[:7]


            # remove current word from sorted_textrank
            if current_word in [word for word, _ in sorted_textrank]:
                sorted_textrank.remove((current_word, current_word_text_rank))

            # get 2 words from sorted_textrank which are not in related_words and add to related_words
            for word, _ in sorted_textrank:
                if len(related_words) == 6:
                    break
                if word not in related_words:
                    related_words.append(word)

            # outer radius result
            # get all the subtopics for the topic
            current_subtopics = df[df["Topic_"] == topic]['Sub-Topic_'].unique()

            outer_radius_res = {}

            for subtopic in current_subtopics:
                if current_word in outer_radius_freq[topic][subtopic]:
                    outer_radius_res[subtopic] = outer_radius_freq[topic][subtopic][current_word]

            month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

            top_words["Data"].append({
                "Month": month_names[int(month) - 1],
                "Topic": topic,
                "Keyword": current_word,
                "Frequency": int(freq),
                "Index": index,
                "MinCorrelation": min_corr,
                "MaxCorrelation": max_corr,
                "InnerRadius": keyword_freq[topic],
                "OuterRadius": outer_radius_res,
                "CorrelationArray": correlation_array,
                "RelatedKeywords": related_words
            })

    # Write the dictionary to a JSON file
    # with open('../data/top_words.json', 'w') as f:
    #     json.dump(top_words, f)
    res = json.dumps(top_words)
    return res

def getTopicKeywords(topic_name, intensity_value):
    df = pd.read_csv('../data/Covid-data-with-topic-names.csv')
    df = df[df["Topic_"] == topic_name]

    # intensity filter
    # read the data/textrank_overall_output.json file
    with open('../data/textrank_overall_output.json') as file:
        # Load the data into a dictionary
        textrank_overall_words = json.load(file)

    # min-max normalise the textrank_overall_words to 0-10
    textrank_overall_words = {k: (v - min(textrank_overall_words.values())) / (max(textrank_overall_words.values()) - min(textrank_overall_words.values())) * 10 for k, v in textrank_overall_words.items()}

    # get topicwise frequency proportion
    # group by topic
    grouped_data_subtopic = df.groupby(['Sub-Topic_'])

    keyword_freq = {}

    total_keywords = 0

    # calculate frequency of words in each topic
    for subtopic, row in grouped_data_subtopic:
        words = [word for text in row['Preprocessed_Text'] for word in ast.literal_eval(text)]
        keyword_freq[subtopic[0]] = len(words)
        total_keywords += len(words)

    # update the frequency to percentage * 2 pie
    for key in keyword_freq.keys():
        keyword_freq[key] = keyword_freq[key] / total_keywords * 2 * math.pi

    # Group the data by month and topic
    grouped_data = df[df["Topic_"] == topic_name].groupby(['month', 'Sub-Topic_'])

    # Initialize a dictionary to store the top 5 frequent words for each topic and each month
    top_words = {"Topics": list(df['Sub-Topic_'].unique()), "Min_freq": 0, "Max_freq": 0, "Data": []}


    # Calculate the correlation matrix for all words
    correlation_matrix = pd.read_csv('../data/correlation_matrix.csv', index_col=0)

    # read the data/textrank_output.json file
    with open('../data/textrank_output.json') as file:
        # Load the data into a dictionary
        textrank_words = json.load(file)

    all_top_5_words = []

    # Iterate over the groups
    for (month, sub_topic), group in grouped_data:
        # Concatenate all the text arrays into one list
        words = [word for text in group['Preprocessed_Text'] for word in ast.literal_eval(text)]

        # Count the frequency of words
        counter = Counter(words)
        
        if intensity_value == 0:
            # Get the top 5 frequent words
            top_5_words = counter.most_common(5)
        else:
            # filter words based on intensity and sort in reverse order

            textrank_overall_words_current = {k: v for k, v in textrank_overall_words.items() 
                                              if v <= intensity_value and k in words}
            textrank_overall_words_current = dict(sorted(textrank_overall_words_current.items(), 
                                                key=lambda x: x[1], reverse=True))
            # Append the top 5 words and their frequencies to the all_top_5_words array
            top_5_words = list(textrank_overall_words_current.items())[:5]
            # replace the value with frequency from counter
            top_5_words = [(word, counter[word]) for word, _ in top_5_words]

        # Append the top 5 words to the all_top_5_words array
        all_top_5_words += top_5_words

    # get the key from all the top 5 words
    freq_words = dict(all_top_5_words).keys()

    # get outer radius for each subtopic
    outer_radius_freq = {}
    topic_words = [word for text in df['Preprocessed_Text'] for word in ast.literal_eval(text)]

    topic_words_counter = Counter(topic_words)

    # group by sub topic
    for sub_topic, subgroup in grouped_data_subtopic:
        words = [word for text in subgroup['Preprocessed_Text'] for word in ast.literal_eval(text)]

        # Count the frequency of words
        counter = Counter(words)
        outer_radius_freq[sub_topic[0]] = {}
        for word in freq_words:
            if word in counter:
                outer_radius_freq[sub_topic[0]][word] = counter[word] / topic_words_counter[word] * 2 * math.pi

    min_freq = min([freq for _, freq in all_top_5_words])
    max_freq = max([freq for _, freq in all_top_5_words])

    top_words["Min_freq"] = min_freq
    top_words["Max_freq"] = max_freq

    
    for (month, sub_topic), group in grouped_data:
        # Concatenate all the text arrays into one list
        words = [word for text in group['Preprocessed_Text'] for word in ast.literal_eval(text)]

        # Count the frequency of words
        counter = Counter(words)
        
        if intensity_value == 0:
            # Get the top 5 frequent words
            top_5_words = counter.most_common(5)
        else:
            # filter words based on intensity and sort in reverse order

            textrank_overall_words_current = {k: v for k, v in textrank_overall_words.items() 
                                              if v <= intensity_value and k in words}
            textrank_overall_words_current = dict(sorted(textrank_overall_words_current.items(), 
                                                key=lambda x: x[1], reverse=True))
            # Append the top 5 words and their frequencies to the all_top_5_words array
            top_5_words = list(textrank_overall_words_current.items())[:5]
            # replace the value with frequency from counter
            top_5_words = [(word, counter[word]) for word, _ in top_5_words]
        
        # Store the top 5 frequent words in the dictionary
        for index, (current_word, freq) in enumerate(top_5_words, start=1):
            # Get the correlation scores for the word from the correlation matrix
            correlation_array = correlation_matrix[current_word].to_dict()

            # Filter the correlation array to only include words that are in the top_5_words array
            correlation_array = {k: v for k, v in correlation_array.items() if k in freq_words}

            # Set the value of the current word to the maximum value in the correlation array
            correlation_array[current_word] = max(correlation_array.values())

            # get min and max values from the correlation array
            min_corr = min(correlation_array.values())
            max_corr = max(correlation_array.values())

            # Get the two words with the maximum values in the correlation array
            correlated_words = sorted(correlation_array, key=correlation_array.get, reverse=True)[:3]

            closest_freq_words = sorted(all_top_5_words, key=lambda x: abs(x[1] - freq))
            closest_freq_words = list(set([word for word, _ in closest_freq_words]))[:5]

            # remove current word from closest_freq_words and correlated_words
            if current_word in closest_freq_words:
                closest_freq_words.remove(current_word)
            if current_word in correlated_words:
                correlated_words.remove(current_word)
            
            # get 2 words from closest_freq_words which are not in correlated_words
            related_words = []
            related_words += correlated_words[:2]

            for word in closest_freq_words:
                if len(related_words) == 4:
                    break
                if word not in correlated_words:
                    related_words.append(word)
            
            textrank_data = textrank_words[topic_name][sub_topic]

            # filter the data from textrank_data to only include words that are in all_top_5_words
            textrank_data = {k: v for k, v in textrank_data.items() if k in freq_words}

            current_word_text_rank = textrank_data[current_word]

            sorted_textrank = sorted(textrank_data.items(), key=lambda x: abs(x[1] - current_word_text_rank))[:7]

            # remove current word from sorted_textrank
            if current_word in [word for word, _ in sorted_textrank]:
                sorted_textrank.remove((current_word, current_word_text_rank))


            # get 2 words from sorted_textrank which are not in related_words and add to related_words
            for word, _ in sorted_textrank:
                if len(related_words) == 6:
                    break
                if word not in related_words:
                    related_words.append(word)

            # outer radius result
            # get all the subtopics for the topic
            current_subtopics = df['Sub-Topic_'].unique()

            outer_radius_res = {}

            for subtopic in current_subtopics:
                if current_word in outer_radius_freq[subtopic]:
                    outer_radius_res[subtopic] = outer_radius_freq[subtopic][current_word]

            month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

            top_words["Data"].append({
                "Month": month_names[int(month) - 1],
                "Topic": sub_topic,
                "Keyword": current_word,
                "Frequency": int(freq),
                "Index": index,
                "MinCorrelation": min_corr,
                "MaxCorrelation": max_corr,
                "InnerRadius": keyword_freq[sub_topic],
                "OuterRadius": outer_radius_res,
                "CorrelationArray": correlation_array,
                "RelatedKeywords": related_words
            })

    # Write the dictionary to a JSON file
    # with open('../data/top_words.json', 'w') as f:
    #     json.dump(top_words, f)
    res = json.dumps(top_words)
    return res

def getSubTopicKeywords(sub_topic_name, intensity_value):
    df = pd.read_csv('../data/Covid-data-with-topic-names.csv')
    df = df[df["Sub-Topic_"] == sub_topic_name]
    # Group the data by month
    grouped_data = df.groupby(['month'])

    # intensity filter
    # read the data/textrank_overall_output.json file
    with open('../data/textrank_overall_output.json') as file:
        # Load the data into a dictionary
        textrank_overall_words = json.load(file)

    # min-max normalise the textrank_overall_words to 0-10
    textrank_overall_words = {k: (v - min(textrank_overall_words.values())) / (max(textrank_overall_words.values()) - min(textrank_overall_words.values())) * 10 for k, v in textrank_overall_words.items()}

    # Initialize a dictionary to store the top 5 frequent words for each month
    top_words = {"Topics": [sub_topic_name], "Min_freq": 0, "Max_freq": 0, "Data": []}


    # Calculate the correlation matrix for all words
    correlation_matrix = pd.read_csv('../data/correlation_matrix.csv', index_col=0)

    # read the data/textrank_output.json file
    with open('../data/textrank_output.json') as file:
        # Load the data into a dictionary
        textrank_words = json.load(file)

    all_top_20_words = []


    # Iterate over the groups
    for month, group in grouped_data:
        # Concatenate all the text arrays into one list
        words = [word for text in group['Preprocessed_Text'] for word in ast.literal_eval(text)]

        # Count the frequency of words
        counter = Counter(words)
        
        if intensity_value == 0:
            # Get the top 20 frequent words
            top_20_words = counter.most_common(20)
        else:
            # filter words based on intensity and sort in reverse order

            textrank_overall_words_current = {k: v for k, v in textrank_overall_words.items() 
                                              if v <= intensity_value and k in words}
            textrank_overall_words_current = dict(sorted(textrank_overall_words_current.items(), 
                                                key=lambda x: x[1], reverse=True))
            # Append the top 5 words and their frequencies to the all_top_5_words array
            top_20_words = list(textrank_overall_words_current.items())[:20]
            # replace the value with frequency from counter
            top_20_words = [(word, counter[word]) for word, _ in top_20_words]

        # Append the top 5 words to the all_top_5_words array
        all_top_20_words += top_20_words

    # get the key from all the top 5 words
    freq_words = dict(all_top_20_words).keys()

    min_freq = min([freq for _, freq in all_top_20_words])
    max_freq = max([freq for _, freq in all_top_20_words])

    top_words["Min_freq"] = min_freq
    top_words["Max_freq"] = max_freq

    
    for month, group in grouped_data:
        # Concatenate all the text arrays into one list
        words = [word for text in group['Preprocessed_Text'] for word in ast.literal_eval(text)]

        # Count the frequency of words
        counter = Counter(words)
        
        if intensity_value == 0:
            # Get the top 20 frequent words
            top_20_words = counter.most_common(20)
        else:
            # filter words based on intensity and sort in reverse order

            textrank_overall_words_current = {k: v for k, v in textrank_overall_words.items() 
                                              if v <= intensity_value and k in words}
            textrank_overall_words_current = dict(sorted(textrank_overall_words_current.items(), 
                                                key=lambda x: x[1], reverse=True))
            # Append the top 5 words and their frequencies to the all_top_5_words array
            top_20_words = list(textrank_overall_words_current.items())[:20]
            # replace the value with frequency from counter
            top_20_words = [(word, counter[word]) for word, _ in top_20_words]

        
        # Store the top 20 frequent words in the dictionary
        for index, (current_word, freq) in enumerate(top_20_words, start=1):
            # Get the correlation scores for the word from the correlation matrix
            correlation_array = correlation_matrix[current_word].to_dict()

            # Filter the correlation array to only include words that are in the top_20_words array
            correlation_array = {k: v for k, v in correlation_array.items() if k in freq_words}

            # Set the value of the current word to the maximum value in the correlation array
            correlation_array[current_word] = max(correlation_array.values())

            # get min and max values from the correlation array
            min_corr = min(correlation_array.values())
            max_corr = max(correlation_array.values())

            # Get the two words with the maximum values in the correlation array
            correlated_words = sorted(correlation_array, key=correlation_array.get, reverse=True)[:3]

            closest_freq_words = sorted(all_top_20_words, key=lambda x: abs(x[1] - freq))
            closest_freq_words = list(set([word for word, _ in closest_freq_words]))[:5]

            # remove current word from closest_freq_words and correlated_words
            if current_word in closest_freq_words:
                closest_freq_words.remove(current_word)
            if current_word in correlated_words:
                correlated_words.remove(current_word)
                
            # get 2 words from closest_freq_words which are not in correlated_words
            related_words = []
            related_words += correlated_words[:2]

            for word in closest_freq_words:
                if len(related_words) == 4:
                    break
                if word not in correlated_words:
                    related_words.append(word)

            for topic_name in textrank_words.keys():
                if sub_topic_name in textrank_words[topic_name]:
                    break
            
            textrank_data = textrank_words[topic_name][sub_topic_name]

            # filter the data from textrank_data to only include words that are in all_top_5_words
            textrank_data = {k: v for k, v in textrank_data.items() if k in freq_words}

            current_word_text_rank = textrank_data[current_word]

            sorted_textrank = sorted(textrank_data.items(), key=lambda x: abs(x[1] - current_word_text_rank))[:7]

            # remove current word from sorted_textrank
            if current_word in [word for word, _ in sorted_textrank]:
                sorted_textrank.remove((current_word, current_word_text_rank))
            
            # get 2 words from sorted_textrank which are not in related_words and add to related_words
            for word, _ in sorted_textrank:
                if len(related_words) == 6:
                    break
                if word not in related_words:
                    related_words.append(word)


            month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

            top_words["Data"].append({
                "Month": month_names[int(month[0]) - 1],
                "Topic": sub_topic_name,
                "Keyword": current_word,
                "Frequency": int(freq),
                "Index": index,
                "MinCorrelation": min_corr,
                "MaxCorrelation": max_corr,
                "InnerRadius": 0,
                "OuterRadius": {},
                "CorrelationArray": correlation_array,
                "RelatedKeywords": related_words
            })

    # Write the dictionary to a JSON file
    # with open('../data/top_words.json', 'w') as f:
    #     json.dump(top_words, f)
    res = json.dumps(top_words)
    return res


    


