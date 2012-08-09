#!/usr/bin/env python

import re
from os import path
from flask import Flask, render_template, request, jsonify, after_this_request
from flask import send_from_directory

app = Flask(__name__)
app.secret_key = "secret"


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['get', 'post'])
def analyze():
    result = {'status': "error", 'message': "Not implemented"}
    return jsonify(result)

@app.route('/patscan.js')
def patscanjs():
    @after_this_request
    def fixup_mimetype(response):
        response.mimetype = "text/javascript"
        return response
    return render_template('patscan.js')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(path.join(app.root_path, 'static'),
                               'favicon.ico',
                               mimetype="image/vnd.microsoft.icon")

if __name__ == '__main__':
    app.run(debug=True)
