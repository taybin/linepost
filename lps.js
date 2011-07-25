// for brew install
require.paths.unshift('/usr/local/lib/node/');

// ----------------
// command for git bin
var _git_bin = 'git';

// repo_name -> local repo dir map
var _repos = {
    'linepost': '/Users/james/sandbox/linepost'
};

// sqlite db
var _db = {};
var _db_path = 'lps.sdb';

// ----------------

var express = require('express'),
    connect = require('connect'),
    sys = require('sys'),
    fs = require('fs'),
    exec = require('child_process').exec,
    sqlite3 = require('sqlite3').verbose(),
    app = express.createServer();

//-------------------------
// Initialization
//-------------------------

(function init() {
    var is_new_db = false;
    
    try {
        fs.lstatSync(_db_path);
    }
    catch (error) {
        is_new_db = true;
    }
    
    _db = new sqlite3.Database(_db_path, function(error) { if (error) { throw error; } });
    _db.serialize(); // put in serial mode
    
    // calls are queued so we can start using the db even if we haven't completed open above
    if (is_new_db) {
        // FIXME - not optimized at all, just blatted for the time being
        // TODO - date
        _db.run('CREATE TABLE comments( ' +
                'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
                'repo_name TEXT, ' +
                'commit_sha TEXT, ' +
                'file_idx INTEGER, ' +
                'row_idx INTEGER, ' +
                'added_timestamp INTEGER, ' +
                'edited_timestamp INTEGER, ' +
                'comment_text TEXT );', function(error) {if (error) { throw error; } });
    }

}());

var _isGoodSha = function(sha) {
    var sha_matches = sha.match(/(?:\d|[a-f]){6,40}/i);
    return (sha_matches !== null && sha_matches.length === 1);
};

// assumes comment is valid
var _add_comment = function(comment, callback) {
    _db.run('INSERT INTO comments VALUES(NULL, $repo_name, $commit_sha, $file_idx, $row_idx, $added_timestamp, $edited_timestamp, $comment_text)',
            { '$repo_name': comment.repo_name,
              '$commit_sha': comment.commit_sha,
              '$file_idx': comment.file_idx,
              '$row_idx': comment.row_idx,
              '$added_timestamp': comment.added_timestamp,
              '$edited_timestamp': comment.edited_timestamp,
              '$comment_text': comment.comment_text
            },
            callback);
};

var _update_comment = function(id, comment_text, callback) {
    _db.run('UPDATE comments SET comment_text=$comment_text, edited_timestamp=$edited_timestamp WHERE id=$id',
            { '$comment_text': comment_text,
              '$edited_timestamp': new Date().getTime(),
               '$id': id
            },
            callback);
};

// assume params are clean
var _get_comments = function(repo_name, sha, callback) {
    // FIXME stores in memory so assuming not a whole lot of comments
    _db.all( 'SELECT * from comments WHERE repo_name = $repo_name AND commit_sha LIKE $commit_sha || "%"',
             { '$repo_name': repo_name,
               '$commit_sha': sha },
             function(error, rows) {
                 callback(error, rows);
             });
};


// Testing
/*
(function(){
    _add_comment( {
        'repo_name': 'linepost',
        'commit_sha': 'a084bff88',
        'file_idx': '1',
        'row_idx': '2',
        'timestamp': new Date().getTime(),
        'comment_text': '"Hey there guy"'
    },
    function(error) { if(error) { throw error; } });
    
    //_get_comments('linepost', 'ae12', function(rows) {console.log(sys.inspect(rows));});
}());
*/

var _api_sendError = function(error_code, error_msg, res) {
    var error_stringified = JSON.stringify({'error': error_msg});
    
    res.writeHead(error_code,
                  {'Content-Type': 'application/json',
                   'Content-Length': error_stringified.length});
    res.write(error_stringified);
    res.end();
    console.log('sent api error code: ' + error_code + ', error: ' + error_stringified );
};

// TODO - nicer 404 pages etc
var _content_sendError = function(error_code, error_msg, res) {
    res.writeHead(error_code,
                  {'Content-Type': 'text/plain',
                   'Content-Length': error_msg.length});
    res.write(error_msg);
    res.end();
    console.log('sent content error code: ' + error_code + ', error: ' + error_msg );
};

var _get_git_show = function(repo_name, sha, res, callback) {
    // SHA \01
    // Author Name <Author Email>\01
    // Subject \n Body \01
    // Author Date \01
    // DIFF EOF
    var format_str = '--pretty=format:"%H\01%an <%ae>\01%s\n%b\01%at\01"';
    exec( _git_bin + ' show ' + format_str + ' ' + sha,
          {cwd: _repos[repo_name]},
          function(error, stdout, stderr) {
              if (error) {
                  callback( {status: 500, message: 'Error running git show: ' + error}, null );
              }
              else if (stderr) {
                  callback( {status: 500, message: 'Error running git show - has stderr: ' + stderr}, null );
              }
              else if (stdout.length === 0) {
                  callback( {status: 500, message: 'Error running git show - no output'}, null);
              }
              else {
                  var split_output_array = stdout.split('\01');
                  
                  if (split_output_array.length !== 5) {
                      callback( {status: 500, message: 'Error running git show - bad output: ' + stdout}, null );
                  }
                  else {
                      var response = {
                            'sha': split_output_array[0],
                            'author-name-and-email': split_output_array[1],
                            'subject-and-body': split_output_array[2],
                            'author-date': split_output_array[3],
                            'diff': split_output_array[4]
                      }
                      callback(null, response);
                      console.log('sent good output from git-show');
                  }
              }
          });
};

var _content_sendCommitPage = function(reponame, sha, res) {
    // TODO render template, include ajax-pull to api
    res.render('commit.haml', {
        locals: {'sha': sha,
                 'repo': reponame },
        layout: false});
};

// ----- App middleware + routing
app.use(connect.logger());

app.use(express.staticProvider(__dirname + '/static'));

app.use(express.bodyDecoder());

// TODO - Responder class with sendError() and sendData()
// and a factory method responderForFormat(format)

var _respond = {
    'html': function(repo_name, sha, res) {
        res.render('commit.haml', {
            locals: {
                'sha': sha,
                'repo': repo_name 
            },
            layout: false
        });
    },
    'json': function(repo_name, sha, res) {
        var git_show_and_comments = {};
        
        _get_git_show(repo_name, sha, res, function(error, result) {
            if (error) {
                _api_sendError(error.status, error.message, res);
                return;
            }
            
            git_show_and_comments.git_show = result;

            _get_comments(repo_name, sha, function(error, result) {
                if (error) {
                    _api_sendError(error.status, error.message, res);
                    return;
                }
                git_show_and_comments.comments = result;
                var stringified_response = JSON.stringify(git_show_and_comments);
                res.writeHead(200, {'Content-Length': stringified_response.length,
                                    'Content-Type': 'application/json'});
                res.write(stringified_response);
                res.end();
            });
        });
    }
};

var _respondWithError = {
    'html': _content_sendError,
    'json': _api_sendError
};

app.get('/:repo/:sha', function(req, res) {
    var repo_name = req.params.repo;
    var sha = req.params.sha;
    var format = req.query.format || 'html';
    
    // Do we have this repo name mapped to a local dir?
    if (_repos[repo_name] === undefined) {
        var msg = 'Undefined repo: "' + repo_name + '"';
        try {
            _respondWithError[format](404, msg, res);
        }
        catch (e1) {
            _content_sendError(415, 'Unknown format: ' + format, res);
        }
        return;
    }
    
    if (_isGoodSha(sha)) {
        try {
            _respond[format](repo_name, sha, res);
        }
        catch (e2) {
            _content_sendError(415, 'Unknown format: ' + format, res);
        }
        return;
    }
    else {
        _content_sendError(404, 'Bad sha: "' + sha + '"', res);
    }
});

app.post('/:repo/:sha/comments', function(req, res) {
    var repo_name = req.params.repo;
    var sha = req.params.sha;
    console.log('Received POST: ' + sys.inspect(req.body));
    
    // TODO - validate vals?
    var now = new Date().getTime();
    var comment = {
        comment_text: req.body.comment_text,
        row_idx: req.body.row_idx,
        file_idx: req.body.file_idx,
        commit_sha: sha,
        repo_name: repo_name,
        added_timestamp: now,
        edited_timestamp: now
    };
    
    _add_comment(comment, function(error) {
        if (error) {
            _api_sendError(500, error, res);
        }
        else {
            var result_stringified = JSON.stringify(this);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': result_stringified.length
             });
            res.write(result_stringified);
            res.end();
        }
    });
});

app.put('/:repo/:sha/comments/:id', function(req, res) {
    console.log('Received PUT: ' + sys.inspect(req.body));
    
    // TODO - validate?
    _update_comment(req.params.id, req.body.comment_text, function(error) {
        if (error) {
            _api_sendError(500, error, res);
        }
        else {
            res.writeHead(200);
            res.end();
        }
    })
});

app.listen(3000);