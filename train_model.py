import pandas as pd

# Load the dataset
df = pd.read_csv("phishing_email_dataset.csv")

print("First 5 rows:\n")
print(df.head())

print("\nColumn names:\n")
print(df.columns)

print("\nDataset shape:")
print(df.shape)

print("\nMissing values in each column:")
print(df.isnull().sum())