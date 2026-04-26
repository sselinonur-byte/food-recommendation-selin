"""
One-time training script.
Run: python train_cf.py [--min-user N] [--min-biz N] [--factors N] [--epochs N]
The trained model is saved to cf_model.pkl and loaded automatically at API startup.
"""
import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import cf_model

parser = argparse.ArgumentParser()
parser.add_argument('--min-user',  type=int, default=3,  help='Min reviews per user')
parser.add_argument('--min-biz',   type=int, default=5,  help='Min reviews per business')
parser.add_argument('--factors',   type=int, default=50, help='SVD latent factors')
parser.add_argument('--epochs',    type=int, default=20, help='SGD epochs')
args = parser.parse_args()

db = SessionLocal()
t0 = time.time()

cf_model.train(
    db,
    min_user_reviews=args.min_user,
    min_biz_reviews=args.min_biz,
    n_factors=args.factors,
    n_epochs=args.epochs,
)

db.close()
print(f'Training complete in {(time.time() - t0) / 60:.1f} minutes.')
