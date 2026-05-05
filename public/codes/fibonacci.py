limit = int(input("Enter range: "))
a, b = 0, 1

print("Fibonacci series:")
for _ in range(limit):
    print(a, end=" ")
    a, b = b, a + b