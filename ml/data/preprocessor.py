"""
BroadbandX ML Service - Data Preprocessor
Handles data loading, cleaning, and preparation for ML models.
"""
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from typing import Tuple, Optional, List, Dict
import joblib
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import SYNTHETIC_DATA_PATH, MODELS_DIR, FEATURE_CONFIG


class DataPreprocessor:
    """
    Preprocesses data for ML model training and inference.
    
    Handles:
    - Data loading and validation
    - Missing value imputation
    - Feature scaling
    - Train/test splitting
    - Label encoding for categorical variables
    """
    
    def __init__(self):
        """Initialize the preprocessor."""
        self.scaler = StandardScaler()
        self.label_encoders: Dict[str, LabelEncoder] = {}
        self.feature_columns: List[str] = []
        self.is_fitted = False
    
    def load_data(self, filepath: Optional[Path] = None) -> pd.DataFrame:
        """
        Load data from CSV file.
        
        Args:
            filepath: Path to CSV file. Uses default synthetic data path if None.
            
        Returns:
            Loaded DataFrame
        """
        if filepath is None:
            filepath = SYNTHETIC_DATA_PATH
        
        if not Path(filepath).exists():
            raise FileNotFoundError(
                f"Data file not found: {filepath}. "
                "Please run the data generator first: python -m data.generator"
            )
        
        df = pd.read_csv(filepath)
        
        # Convert date columns
        date_columns = ["customer_since", "churn_date", "last_activity_date"]
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce")
        
        print(f"Loaded {len(df)} records from {filepath}")
        return df
    
    def validate_data(self, df: pd.DataFrame) -> bool:
        """
        Validate that data has required columns and proper types.
        
        Args:
            df: DataFrame to validate
            
        Returns:
            True if valid, raises exception otherwise
        """
        required_columns = FEATURE_CONFIG["churn_features"] + [FEATURE_CONFIG["target_column"]]
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Check for infinite values
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        inf_cols = [col for col in numeric_cols if np.isinf(df[col]).any()]
        if inf_cols:
            print(f"Warning: Infinite values found in columns: {inf_cols}")
            for col in inf_cols:
                df[col] = df[col].replace([np.inf, -np.inf], np.nan)
        
        return True
    
    def handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing values in the dataset.
        
        Args:
            df: DataFrame with potential missing values
            
        Returns:
            DataFrame with imputed values
        """
        df = df.copy()
        
        # For numeric columns, fill with median
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].isna().any():
                median_val = df[col].median()
                df[col] = df[col].fillna(median_val)
                print(f"Filled {col} missing values with median: {median_val:.2f}")
        
        # For categorical columns, fill with mode
        categorical_cols = df.select_dtypes(include=["object", "category"]).columns
        for col in categorical_cols:
            if df[col].isna().any():
                mode_val = df[col].mode()[0] if len(df[col].mode()) > 0 else "Unknown"
                df[col] = df[col].fillna(mode_val)
                print(f"Filled {col} missing values with mode: {mode_val}")
        
        return df
    
    def prepare_features(
        self,
        df: pd.DataFrame,
        feature_list: Optional[List[str]] = None,
        fit_scaler: bool = True
    ) -> np.ndarray:
        """
        Prepare feature matrix for model training/inference.
        
        Args:
            df: Input DataFrame
            feature_list: List of feature columns to use. Uses default churn features if None.
            fit_scaler: Whether to fit the scaler (True for training, False for inference)
            
        Returns:
            Scaled feature matrix as numpy array
        """
        if feature_list is None:
            feature_list = FEATURE_CONFIG["churn_features"]
        
        # Ensure all features exist
        missing = [f for f in feature_list if f not in df.columns]
        if missing:
            raise ValueError(f"Features not found in data: {missing}")
        
        self.feature_columns = feature_list
        X = df[feature_list].values.astype(np.float64)
        
        # Handle any remaining NaN values
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
        
        if fit_scaler:
            X_scaled = self.scaler.fit_transform(X)
            self.is_fitted = True
        else:
            if not self.is_fitted:
                raise ValueError("Scaler not fitted. Call with fit_scaler=True first.")
            X_scaled = self.scaler.transform(X)
        
        return X_scaled
    
    def prepare_target(self, df: pd.DataFrame) -> np.ndarray:
        """
        Prepare target variable for model training.
        
        Args:
            df: Input DataFrame
            
        Returns:
            Target array
        """
        target_col = FEATURE_CONFIG["target_column"]
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in data")
        
        return df[target_col].values.astype(int)
    
    def split_data(
        self,
        X: np.ndarray,
        y: np.ndarray,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Split data into train and test sets with stratification.
        
        Args:
            X: Feature matrix
            y: Target array
            test_size: Proportion of data for testing
            random_state: Random seed
            
        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=test_size,
            random_state=random_state,
            stratify=y
        )
        
        print(f"Train set: {len(X_train)} samples ({y_train.mean()*100:.1f}% positive)")
        print(f"Test set: {len(X_test)} samples ({y_test.mean()*100:.1f}% positive)")
        
        return X_train, X_test, y_train, y_test
    
    def save_scaler(self, filepath: Optional[Path] = None) -> None:
        """Save the fitted scaler to disk."""
        if filepath is None:
            filepath = MODELS_DIR / "feature_scaler.joblib"
        
        joblib.dump({
            "scaler": self.scaler,
            "feature_columns": self.feature_columns,
            "is_fitted": self.is_fitted
        }, filepath)
        print(f"Scaler saved to: {filepath}")
    
    def load_scaler(self, filepath: Optional[Path] = None) -> None:
        """Load a fitted scaler from disk."""
        if filepath is None:
            filepath = MODELS_DIR / "feature_scaler.joblib"
        
        if not Path(filepath).exists():
            raise FileNotFoundError(f"Scaler file not found: {filepath}")
        
        data = joblib.load(filepath)
        self.scaler = data["scaler"]
        self.feature_columns = data["feature_columns"]
        self.is_fitted = data["is_fitted"]
        print(f"Scaler loaded from: {filepath}")
    
    def get_processed_data(
        self,
        filepath: Optional[Path] = None,
        feature_list: Optional[List[str]] = None,
        test_size: float = 0.2
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, pd.DataFrame]:
        """
        Complete pipeline to load and preprocess data.
        
        Args:
            filepath: Path to data file
            feature_list: List of features to use
            test_size: Test set proportion
            
        Returns:
            Tuple of (X_train, X_test, y_train, y_test, original_df)
        """
        # Load data
        df = self.load_data(filepath)
        
        # Validate
        self.validate_data(df)
        
        # Handle missing values
        df = self.handle_missing_values(df)
        
        # Prepare features and target
        X = self.prepare_features(df, feature_list, fit_scaler=True)
        y = self.prepare_target(df)
        
        # Split data
        X_train, X_test, y_train, y_test = self.split_data(X, y, test_size)
        
        # Save scaler
        self.save_scaler()
        
        return X_train, X_test, y_train, y_test, df
