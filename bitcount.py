from itertools import product

def count_dominant_patterns(n):
    """
    Loops through every binary string of length n.
    Counts how many strings have:
      - more '11' than '10'
      - more '10' than '11'
      - equal numbers
    """

    count_11s = 0
    count_10s = 0
    ties = 0

    for bits in product("01", repeat=n):
        s = "".join(bits)

        c11 = 0
        c10 = 0

        for i in range(len(s) - 1):
            pair = s[i:i+2]
            if pair == "11":
                c11 += 1
            elif pair == "10":
                c10 += 1

        if c11 > c10:
            count_11s += 1
        elif c10 > c11:
            count_10s += 1
        else:
            ties += 1

        winstring = "tie"
        if c11>c10:
            winstring = "11s win"
        elif c10>c11:
            winstring = "10s win"

        print (f"{s}: 11s={c11}, 10s={c10}, {winstring}" )

    return count_11s, count_10s, ties


for n in range(6, 7):
    c11, c10, ties = count_dominant_patterns(n)
    total = 2**n

    print(f"\nn = {n}")
    print(f"11 dominant: {c11}")
    print(f"10 dominant: {c10}")
    print(f"ties       : {ties}")
    print(f'competitive advantage (11/10): {c10 / c11 if c11 != 0 else "inf"}')
    print(f"total      : {total}")