var f = require('findit'),
    spawn = require('child_process').spawn,
    readline = require('readline'),
    fs = require('fs'),
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    }),
    repoParam = null,
    repoFolder = null,
    finder = null,
    regex = /(.*)\/(.*)\.git/,
    clone = null;


if(process.argv.length < 3) {
  console.error('Please provide the clone URL for the repo hosting the book');
  process.kill();
} 

repoParam = process.argv[2];
repoFolder = repoParam.match(regex);

if(!repoFolder) {
  console.error('Please provide the clone URL for the repo hosting the book (https://git.com/user/repo.git)');
  process.kill();
} 

repoFolder = repoFolder[2];
clone = spawn('git', ['clone', repoParam]);

clone.stdout.setEncoding('utf8');
clone.stdout.on('data', function(data) {
  console.log(data);
});

clone.stderr.setEncoding('utf8');
clone.stderr.on('data', function(data) {
  console.log(data);
});

clone.on('close', function(code) {
  var nfiles = 0,
      files = [];
  if(code !== 0) return;

  console.log('...done!');
  console.log('Checking for markdown files');
  console.log('===========================');
  finder = f.find('./' + repoFolder);
  finder.on('file', function(file, stat) {
    if(/.*\.md/.test(file) || /.*\.markdown/.test(file)) {
      nfiles++;
      files.push(file);
    }
  });

  finder.on('end', function() {
    var selection = [],
        withTitle = false;

    if(nfiles === 0) {
      console.log('No markdown files found in this repo!');
      process.kill();
    }

    console.log('Markdown files found:');
    files.forEach(function(file, i) {
      console.log((i+1) + ') ' + file);
    });

    process.chdir('./' + repoFolder);
    askTitle();

    function askTitle() {
      var title, author;
      rl.question('Do you want to provide a title (Title + Author)? yes/no: ', function(sel) {
        if(sel !== 'yes' && sel !== 'no') {
          askTitle();
        } else {
          if(sel === 'yes') {
            rl.question('Author: ', function(a) {
              author = a;
              rl.question('Title: ', function(t) {
                title = t;
                fs.writeFileSync('title.txt', '%' + author + '\n%' + title);
                withTitle = true;
                askSelection();
              });
            });
          } else {
            askSelection();
          }
        }
      });
    }

    function askSelection() {
      var correctParams = true,
          pandoc = null;
      selection = [];
      rl.question('Please write which files you want to include in the ebook, comma-separated: ', function(sel) {
        sel.split(',')
          .forEach(function(index) {
            if(!files[parseInt(index) - 1]) {
              correctParams = false;    
            }
            selection.push(files[parseInt(index) - 1].replace('./' + repoFolder + '/', ''));
          });

        if(!correctParams) {
          console.log('Wrong file index, please select correctly some files');
          askSelection();          
        } else {
          rl.close();

          if(withTitle) selection.unshift('./title.txt');
          selection.unshift(repoFolder + '.epub');
          selection.unshift('-o');
          selection.unshift('-S');
          pandoc = spawn('pandoc', selection);
          pandoc.stdout.on('data', function(data) {
            console.log(data);
          });
          pandoc.stderr.setEncoding('utf8');
          pandoc.stderr.on('data', function(data) {
            console.log(data);
          });
          pandoc.on('close', function() {
            spawn('mv', [repoFolder + '.epub', '../']);
            process.chdir('../');
            spawn('rm', ['-r', './' + repoFolder]);
          });
        }
      });
    };
  });

});