import json
import os
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", help="Input file")
    parser.add_argument("--table", "-t", help="Table name")

    args = parser.parse_args()
    if not os.path.exists(args.input):
        print("Input file does not exist")
        return
    
    with open(args.input, "r") as f:
        data = json.load(f)

    columns = data[0].keys()

    with open("output.sql", "w") as f:
        for row in data:
            # Put the values in quotes if they are strings
            for key in row:
                if isinstance(row[key], str):
                    row[key] = f"'{row[key]}'"
                if row[key] == "NULL":
                    row[key] = "NULL"
            f.write(f"INSERT INTO {args.table} ({', '.join(columns)}) VALUES ({', '.join([str(row[key]) for key in row])});\n")

if __name__ == "__main__":
    main()