#!/usr/bin/env python

"""
Extract from:

"material_properties" : {
        "pore_volume_He" : 40.672020557588,
        "unit_cell_volume" : 454.923947,
        "density" : 1754.5316328355,
        "df" : 3.44748,
        "dif" : 4.1829,
        "di" : 4.1829,
        "Heat_capacity" : 0.935,
        "surface_area_He" : 1456.37,
        }

"material_metadata" : {
        "id" : 1,
        "formula" : "Si8O16",
        "type" : "zeo",
        "name" : "ABW",
        "subtype" : "IZA"
    },
"about" : {
        "_ccsi" : {
            "url" : "...",
            "IZA_code" : "ABW"

"""

import argparse
import pymongo
import operator
import sys

MP_PROPERTIES = {
    'surface_area_He': 'surface area',
    'density': 'density',
    'di': 'Di',
    'df': 'Df'
}
THERMO_PROPERTIES = {
    'heat_of_adsorption': 'Heat of adsorption',
    'henry_coefficient': 'Henry coefficient'
}
def extract_properties(coll, outf):
    first = True
    for item in coll.find({},['porous', 'material_metadata', 'snl_final']):
        values = {}
        for k, v in MP_PROPERTIES.iteritems():
            values[MP_PROPERTIES[k]] = item['porous']['material_properties'][k]
        for thermo in item['porous']['thermo_parameters']:
            if thermo['component'] == 'CO2':
                k = thermo['type']
                values[THERMO_PROPERTIES[k]] = thermo['values']
        vkeys = sorted(values.keys())
        if first:
            # write header
            header = ",".join(vkeys)
            outf.write("id,type," + header + "\n")
        # write row
        ident = item['snl_final']['snlgroup_key']
        #print(values)
        data = ",".join(("{:f}".format(values[k]) for k in vkeys))
        outf.write(ident + ",zeolite," + data + "\n")
        first = False
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-c", dest="coll", help="collection (porous_materials)", default="porous_materials")
    parser.add_argument("-d", dest="dbname", help="database (test)", default="test")
    parser.add_argument("-o", dest="outfile", help="output file (stdout)", default=None)
    parser.add_argument("-s", dest="server", help="mongodb server host (localhost)", default="localhost")
    args = parser.parse_args()
    conn = pymongo.MongoClient(args.server)
    db = conn[args.dbname]
    coll = db[args.coll]
    if args.outfile is None:
        outfile = sys.stdout
    else:
        outfile = open(args.outfile, "w")
    extract_properties(coll, outfile)

if __name__ == '__main__':
    main()