# Scatter-Vector

Author: Dan Gunter <dkgunter@lbl.gov>

Based heavily on M. Bostock's scatterplot matrix idea, the .html and .js files
define a page that shows one row of a scatterplot matrix at a time, and adds
the ability to dump the selected information into table.

To run, use [Mongoose](http://code.google.com/p/mongoose/) or some similar HTML server. 

For example, in Mongoose on Mac OSX, chdir to this directory and run:

    /Applications/Mongoose.app/Contents/MacOS/Mongoose -document_root `pwd`

Then navigate to <http://localhost:8080/scatter-vector.html>

## Files

Code and presentation

* scatter-vector.js: main JavaScript file
* scatter-vector.html: main HTML file, with embedded CS and some JS for the "Get selected" button

Data

* iris.csv: Canonical "Iris" data set
* zeo.csv: EFRC zeolite data (108 zeolites), created by `extract_porous_properties.py`

Utility

* `extract_porous_properties.py`: For EFRC data, get a CSV file from the MongoDB data
 