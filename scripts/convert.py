import csv
import json
import os
import argparse
import bcrypt

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", help="Input file")
    parser.add_argument("--password", "-p", help="Include password or not")

    args = parser.parse_args()
    if not os.path.exists(args.input):
        print("Input file does not exist")
        return
    
    data = open(args.input, "r")
    reader = csv.DictReader(data)
    out = json.dumps([row for row in reader], indent=4)

    common_password = None

    if args.password:
        common_password = "qwertyuiop"
        salt = bcrypt.gensalt(rounds=10)
        hashed_password = bcrypt.hashpw(common_password.encode("utf-8"), salt)

    json_data = json.loads(out)

    user_id = 2000000

    for i, row in enumerate(json_data):
        if common_password:
            json_data[i]["password"] = hashed_password.decode("utf-8")
        json_data[i]["id"] = user_id + i

    with open("output.json", "w") as f:
        f.write(json.dumps(json_data, indent=4))

if __name__ == "__main__":
    main()