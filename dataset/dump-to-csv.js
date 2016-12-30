var array = require('./dump.json')[0];

console.log('ID,Text,Colour,Position,Date,Pass_Ct,Rej_Ct');

for (var key in array) {
  if (key.startsWith('cmt:')) {
    var item = array[key];
    var row = '';
    var id = parseInt(key.substr(4));
    var p = item.attr.lastIndexOf(';');
    var colour = item.attr.substr(0, p);
    var pos = item.attr.substr(p + 1);
    var passed = ((item.score % 100 + 100) % 100);
    var rejected = Math.round(-(item.score - passed) / 100);
    row = id.toString() + ',' + item.text.toString().replace(/\n/g, ' ') + ',' + colour + ',' + (pos == 't' ? 'Top' : 'Bottom') + ',"' + (new Date(parseInt(item.created))).toLocaleString() + '",' + passed.toString() + ',' + rejected.toString();
    console.log(row);
  }
}
