import random
import itertools
import re
import math
from datetime import datetime, timedelta
import json

# This program will generate daily maths puzzles, for a specified number of days.
# Each day's will have an easy puzzle, a medium puzzle and a hard puzzle.
# 4 number tiles are selected at random. The day's puzzles need to be solved using those tiles.

# Define the tiles
nums = ['0','1','2','3','4','5','6','7','8','9']
ops = ['+','-','*','/']
extra_ops = ['^', '!']
times_tables_numbers = set([i*j for i in range (1,13) for j in range(1,13)])


def generate_sumfings():

    start_date = datetime.today()
    number_of_puzzles = 364
    puzzles = generate_puzzles(start_date, number_of_puzzles)

    # Convert the dictionary to JSON-compatible format
    # Tuples are not directly JSON serializable, so we need to convert them to lists
    puzzles_json = {key: {k: list(v) if isinstance(v, tuple) else v for k, v in value.items()} for key, value in puzzles.items()}

    # Save the dictionary as a JSON file
    with open('games/sumfing/development/puzzles.json', 'w') as f:
        json.dump(puzzles_json, f, indent=4)

    print("Data has been saved to puzzles.json")
 

def settings(difficulty):

    # Function to define the levels of difficulty
    # EASY will have 5 tiles and two operators. This means all the number terms will have just 1 digit.
    # MEDIUM will have either 5 or 6 tiles and one or two operators. This allows larger numbers to be formed with 2 or 3 digits.
    # HARD will have 6 tiles and the answer will be a larger number than at the easy and medium levels.

    if difficulty == "Easy":
        min_tiles, max_tiles = 3,4
        min_answer, max_answer = 0,25
        operators = ops
        times_tables = False
    
    elif difficulty == "Medium":
        min_tiles, max_tiles = 4,6
        min_answer, max_answer = 25,100
        operators = ops  
        times_tables = True

    elif difficulty == "Hard":
        min_tiles, max_tiles = 5,6
        min_answer, max_answer = 100,500
        operators = ops
        times_tables = False

    elif difficulty == "Extra":
        min_tiles, max_tiles = 5,6
        min_answer, max_answer = 200,2000
        operators = ops + extra_ops
        times_tables = False
    
    else:
        print("difficulty not specified")
        return(None)       

    return (min_tiles, max_tiles, min_answer, max_answer, operators, times_tables)


def format_for_factorials(expr):

    # Function to replace factorial notation with math.factorial function calls

    def factorial_replacer(match):
        number = int(match.group(1))
        if number <10:
            integer = math.factorial(number)            
            return f'{integer}'
        else:
            return None
    
    # Use regex to find all occurrences of !n, which is invalid, and exclude those
    if '!' in expr:
        for substring in ['!0','!1','!2','!3','!4','!5','!6','!7','!8','!9']:
            if substring in expr:
                return None
            
        # 0! which evaluates to 1 is sneaky so exclude it
        if '0!' in expr:
            return None

        expr = re.sub(r'(\d+)!', factorial_replacer, expr)
    return expr


def format_for_indices(expr):
    
    # function to replace exponent operator '^' with '**' and exclude invalid compound operations

    if '^' in expr:
        for substring in ['^+', '^/', '^^', '^!', '^*', '-^', '+^', '/^', '*^']:
            if substring in expr:
                return None

        expr = expr.replace('^', '**')

    return expr


def evaluate_L2R(expr):

    # function to evaluate an expression from left to right
    try:

        # Tokenize the expression
        tokens = re.findall(r'\d+|[+\-/^*]', expr)
    
        # Convert the last token to a number
        result = float(tokens.pop(0))

        while tokens:
            # Get the operator before it
            operator = tokens.pop(0)
            # Get the token before it. Return None if it's not a number (invalid expression)
            next_number = float(tokens.pop(0))
        
            # Evaluate the expression from left to right
            if operator == '+':
                result += next_number
            elif operator == '-':
                result -= next_number
            elif operator == '*':
                result *= next_number
            elif operator == '/':
                result /= next_number
            elif operator == "^":
                result = result**next_number
    except:
        return None

    return result
    

def check_if_sum_is_times_tables_friendly(expr):

    # Extract all numbers in the expression
    numbers = re.findall(r'\b\d+\b', expr)
    
    # Convert numbers to integers
    numbers = [int(num) for num in numbers]
    
    # Check if all numbers are in the set, return a boolean
    return all(num in times_tables_numbers for num in numbers)


def generate_valid_sums(tiles, max_tiles, min_answer, max_answer, times_tables):

    # Function to generate all valid sums which can be made using the tiles
    bidmas_sums = {}
    L2R_sums = {}
    
    # Iterate over lengths from 1 to num_tiles
    for length in range (1,max_tiles+1):

        for r in range(1, length+1):
            # Generate all permutations of the given length

            for perm in itertools.permutations(tiles, r):
                expr = ''.join(perm)
                
                # Only evaluate expressions with digits and valid first and last characters
                if re.search(r'\d', expr) and expr[0] in "1234567890-" and expr[-1] in "1234567890!":

                    #pre-format for ! 
                    expr_formatted_for_factorials = format_for_factorials(expr)
                    if expr_formatted_for_factorials:

                        # evaluate BIDMAS
                        expr_formatted_for_factorials_and_indices = format_for_indices(expr_formatted_for_factorials)
                        try:
                            result = eval(expr_formatted_for_factorials_and_indices)
                        except:
                            result = None
                        
                        if result:
                            if result >= min_answer and result <= max_answer and result == int(result):

                                # OK, now we have a valid sum. Add it to the dictionary 
                                result = int(result)
                                if result not in bidmas_sums:
                                    bidmas_sums[result]=[expr]
                                else:
                                    if expr not in bidmas_sums[result]:
                                        bidmas_sums[result].append(expr)
                        
                        # evaluate L2R
                        try:
                            L2R_result = evaluate_L2R(expr_formatted_for_factorials)
                        except:
                            result = None
                        
                        if L2R_result:
                            if  L2R_result >= min_answer and L2R_result <= max_answer and L2R_result == int(L2R_result):

                                # We have a sum which can be made L to R. Add it to the dictionary 
                                L2R_result = int(L2R_result)
                                if L2R_result not in L2R_sums:
                                    L2R_sums[L2R_result]=[expr]
                                else:
                                    if expr not in L2R_sums[L2R_result]:
                                        L2R_sums[L2R_result].append(expr)

    # Lets only keep result keys that evaluate both by Bidmas and L2R
    selected_sums = {}

    # form the dictionary of acceptable answers.             
    for result,expressions in bidmas_sums.items():
        if result in L2R_sums:
            common_exprs = list(set(expressions) & set(L2R_sums[result]))

            # first, add expressions that work both by Bidmas and L2R 
            if common_exprs:
                selected_sums[result]=common_exprs

    # go through the list again, adding expressions that only work by Bidmas
    for result,expressions in bidmas_sums.items():
        if result in selected_sums:
            common_exprs = list(set(expressions) & set(L2R_sums[result]))
            for expression in expressions:
                if expression not in common_exprs:
                    selected_sums[result].append(expression)

        
    return selected_sums


def generate_good_sums(level, tiles, min_tiles ,max_tiles, min_answer, max_answer, times_tables):

    # Function to generate a dictionary of answer:[expressions] we can use for a given level of difficulty and a given set of tiles

    # get all sums with a result in the valid range
    valid_sums = generate_valid_sums(tiles, max_tiles,min_answer, max_answer, times_tables)

    # Select only sums with results which cannot be achieved with fewer tiles. It will be the shortest expressions for each result   
    shortest_sums = {}
    for (result, expressions) in valid_sums.items():
        expression_lengths = [len(expression) for expression in expressions]
        min_expr_length = min(expression_lengths)
        for expression in expressions:
            if len(expression) == min_expr_length:
                if result not in shortest_sums:
                    shortest_sums[result]=[expression]
                else:
                    shortest_sums[result].append(expression)        
    
    # keep only sums which use minimum number of tiles
    sums_with_minimum_tiles = {}
    for result, expressions in shortest_sums.items():
        if len(expressions[0])>=min_tiles:
            sums_with_minimum_tiles[result]=expressions

    good_sums = sums_with_minimum_tiles.copy()
    for result, expressions in sums_with_minimum_tiles.items():

        operators=['+','-','/','*','^','!']
    
        for expression in expressions:

        # easy sums must be times table friendly
            if level == "Easy":
                if not check_if_sum_is_times_tables_friendly(expression):
                    del(good_sums[result])
                    break

            
        # bonus sums cannot only include + and -
            if level == "Extra":
                if '*' not in expression and '/' not in expression and '^' not in expression and '!' not in expression:
                    del(good_sums[result])
                    break
                
    
    sorted_good_sums = sorted(good_sums.items(), key=lambda x: len(x[1]), reverse=True)
    return sorted_good_sums


def generate_puzzle():

    # function to generate a single day's puzzle
    # choose 4 tiles: duplicates allowed

    numtiles = []
    for _ in range(4):
        numtiles.append(random.choice(nums))
    numtiles.sort()

    # initiate a new puzzle dictionary
    puzzle = {'Tiles':numtiles}

    # get the easy, medium and hard sums
    for level in ["Easy", "Medium", "Hard", "Extra"]:
    
        (min_tiles, max_tiles, min_answer, max_answer, operators, times_tables) = settings(level)
        tiles = numtiles + operators
        sums = generate_good_sums(level, tiles, min_tiles, max_tiles, min_answer, max_answer, times_tables)
        
        if sums:
            puzzle[level] = random.choice(sums)
        else:
            return None
    
    return puzzle



def generate_puzzles(start_date, number_of_puzzles):

    # Function to generate a dictionary of puzzles, where the key is the date

    puzzles = {}

    for i in range (number_of_puzzles):
        date = start_date + timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        puzzle = None
        while not puzzle:
            puzzle = generate_puzzle()
            if puzzle in puzzles.items():
                puzzle = None
        print (puzzle)
        puzzles[date_str]=puzzle
        
    return puzzles


if __name__ == "__main__":
    generate_sumfings()