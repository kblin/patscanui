#!/usr/bin/env python
# PatScanUI - Search for patterns in genomic data
# Copyright (C) 2012  Kai Blin <kai.blin@biotech.uni-tuebingen.de>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import uuid
from os import path, listdir
from flask import Flask, render_template, request, jsonify, after_this_request
from flask import send_from_directory

app = Flask(__name__)
app.secret_key = "secret"
app.config['UPLOAD_FOLDER'] = '/memdisk/store'

ALLOWED_EXTENSIONS = set(['fa', 'fna', 'fasta', 'faa', 'txt'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/check/<filename>')
def check(filename):
    udir = app.config['UPLOAD_FOLDER']
    filelist = [fn for fn in listdir(udir) if path.isfile(path.join(udir,fn))]
    available = filename in filelist

    return jsonify(available=available)

def allowed_filename(name):
    return '.' in name and name.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
def upload():
    new_file = request.files['file']
    if new_file and allowed_filename(new_file.filename):
        filename = "%s.fa" % uuid.uuid4()
        new_file.save(path.join(app.config['UPLOAD_FOLDER'], filename))
        return jsonify(result="ok", filename=filename)
    return jsonify(result="error", message="invalid filename")

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
