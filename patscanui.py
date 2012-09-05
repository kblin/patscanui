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
import subprocess
from os import path, listdir, utime
from flask import Flask, render_template, request, jsonify
from flask import send_from_directory
from helperlibs.wrappers.io import TemporaryPipe

app = Flask(__name__)
app.secret_key = "secret"
app.config['UPLOAD_FOLDER'] = '/memdisk/store'

ALLOWED_EXTENSIONS = set(['fa', 'fna', 'fasta', 'faa', 'txt'])

@app.route('/')
def index():
    return render_template('index.html')

def _is_available(filename):
    udir = app.config['UPLOAD_FOLDER']
    filelist = [fn for fn in listdir(udir) if path.isfile(path.join(udir,fn))]
    return filename in filelist

@app.route('/check/<filename>')
def check(filename):
    available = _is_available(filename)
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


def _update_timestamp(filename):
    udir = app.config['UPLOAD_FOLDER']
    utime(path.join(udir, filename), None)


def _run_patscan(filename, pattern, molecule_type):
    try:
        full_path = path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(full_path, 'r') as handle:
            with TemporaryPipe() as pipe:
                command_line = ['patscan', '-c']
                if molecule_type.lower() == "protein":
                    command_line.append('-p')
                command_line.append(pipe)
                p1 = subprocess.Popen(command_line, stdin=handle, stdout=subprocess.PIPE)
                with open(pipe, 'w') as w:
                    w.write(pattern)
                p2 = subprocess.Popen(['patscan_show_hits'], stdin=p1.stdout, stdout=subprocess.PIPE)
                p1.stdout.close()
                result, error = p2.communicate()
    except IOError as e:
        result = "Running patscan failed: %r" % e
    except OSError as e:
        result = "Running patscan failed: %r" % e

    return result


@app.route('/analyze', methods=['post'])
def analyze():
    pattern = request.form.get('pattern', None)
    filename = request.form.get('filename', None)
    molecule_type = request.form.get('molecule', 'DNA')

    if filename is None or not _is_available(filename):
        return "session expired"

    if pattern is None:
        return "No pattern given"

    _update_timestamp(filename)

    result = _run_patscan(filename, pattern, molecule_type)

    return result


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(path.join(app.root_path, 'static'),
                               'favicon.ico',
                               mimetype="image/vnd.microsoft.icon")

if __name__ == '__main__':
    app.run(debug=True)
