const express = require("express")
const parser = require("body-parser")
const { Client } = require('elasticsearch')
const esClient = new Client({ node: 'http://localhost:9200' })
const app = express()

app.use(parser.json())

var settings = {
  "index": {
    "analysis": {
        "filter": {
            "autocomplete_filter": {
                "type":     "edge_ngram",
                "min_gram": 2,
                "max_gram": 20
            }
        },
        "analyzer": {
            "autocomplete": {
                "type": "custom",
                "tokenizer": "standard",
                "filter": [
                    "lowercase",
                    "autocomplete_filter" 
                ]
            }
        },
    }
  }
}

var mapping = {
    "properties": {
      "username":{
        "type": "text",
        "analyzer": "autocomplete"
      },
      "fullName": {
        "type": "text",
        "analyzer": "autocomplete"
      },
      "userId": {
        "type": "text"
      },
      "createdDate": {
        "type": "date"
      }
    }
}

esClient.indices.create({
  index: 'users',
  body: {
    settings: settings,
    mappings: mapping
  }
});

// esClient.indices.delete({
//   index: 'users'
// })

app.post("/users", (req, res) => {

  esClient.index({
    index: 'users',
    body: {
      "username":req.body.username,
      "fullName": req.body.fullName,
      "userId": req.body.userId,
      "createdDate": Date.now(),
    }
  })
    .then(response => {
      return res.json({ "message": "Indexing successful" })
    })
    .catch(err => {
      return res.status(500).json({ "message": "Error:" + err })
    })
})


app.get("/users", (req, res) => {
  const searchText = req.query.text
  esClient.search({
    index: "users",
    body: {
      query: {
        multi_match: { 
          query:  searchText.trim(),
          fields : ['username', 'fullName'],
          analyzer : "standard"
        }
      },
      sort: ["_score", {"createdDate": "desc"}]
    }
  })
    .then(response => {
      return res.json(response)
    })
    .catch(err => {
      return res.status(500).json({ "message": "Error" })
    })
})

app.listen(process.env.PORT || 3000, () => {
  console.log("connected")
})