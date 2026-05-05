def fact(x):
    if x <= 1:
        return 1
    return x * fact(x - 1)

n = int(input())
print("Factorial is:", fact(n))

total = 0
for i in range(1, n + 1):
    total += i
print("Sum:", total)